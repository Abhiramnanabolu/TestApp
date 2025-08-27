import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// Upsert sections/questions/options for a test in a single sync operation.
// The payload should be: { sections: Array<{ id, title, duration?, defaultPositiveMarks?, defaultNegativeMarks?, questions: Array<{ id, type, text, positiveMarks?, negativeMarks?, options?: Array<{ id, text, isCorrect }> }> }> }
// New client-side items may have temporary ids (e.g., "temp-..."). Those will be treated as creates.

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: testId } = await params;
    if (!testId) {
      return NextResponse.json({ message: 'Test ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const incomingSections: Array<{
      id: string;
      title: string;
      duration?: number | null;
      defaultPositiveMarks?: number | null;
      defaultNegativeMarks?: number | null;
      questions?: Array<{
        id: string;
        type: 'mcq' | 'text' | 'multi-select';
        text: string;
        correctAnswer?: string | null;
        positiveMarks?: number | null;
        negativeMarks?: number | null;
        options?: Array<{ id: string; text: string; isCorrect: boolean }>;
      }>;
    }> = Array.isArray(body?.sections) ? body.sections : [];

    // Verify test exists and user owns it
    const existingTest = await prisma.test.findFirst({
      where: { id: testId, createdBy: session.user.id }
    });

    if (!existingTest) {
      return NextResponse.json({ message: 'Test not found or access denied' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Load existing structure once
      const existingSectionsWithChildren = await tx.section.findMany({
        where: { testId },
        include: {
          questions: {
            include: { options: true }
          }
        }
      });

      const existingSectionIdSet = new Set(existingSectionsWithChildren.map(s => s.id));
      const incomingSectionIdSet = new Set(incomingSections.map(s => s.id).filter(Boolean));

      // Determine sections to delete (present in DB but not in incoming payload)
      const sectionIdsToDelete = existingSectionsWithChildren
        .filter(sec => !incomingSectionIdSet.has(sec.id))
        .map(sec => sec.id);

      if (sectionIdsToDelete.length > 0) {
        // Remove children explicitly to be safe regardless of referential actions
        await tx.option.deleteMany({ where: { question: { sectionId: { in: sectionIdsToDelete } } } });
        await tx.question.deleteMany({ where: { sectionId: { in: sectionIdsToDelete } } });
        await tx.section.deleteMany({ where: { id: { in: sectionIdsToDelete } } });
      }

      // Map existing sections for quick access
      const existingSectionById = new Map(existingSectionsWithChildren.map(s => [s.id, s] as const));

      // Upsert each incoming section
      for (const incomingSection of incomingSections) {
        const isCreate = !incomingSection.id || incomingSection.id.startsWith('temp-') || !existingSectionIdSet.has(incomingSection.id);

        // Create or update section
        const sectionRecord = isCreate
          ? await tx.section.create({
              data: {
                title: incomingSection.title,
                duration: incomingSection.duration ?? null,
                defaultPositiveMarks: incomingSection.defaultPositiveMarks ?? 1.0,
                defaultNegativeMarks: incomingSection.defaultNegativeMarks ?? 0.0,
                testId
              }
            })
          : await tx.section.update({
              where: { id: incomingSection.id },
              data: {
                title: incomingSection.title,
                duration: incomingSection.duration ?? null,
                defaultPositiveMarks: incomingSection.defaultPositiveMarks ?? 1.0,
                defaultNegativeMarks: incomingSection.defaultNegativeMarks ?? 0.0
              }
            });

        const dbSectionId = sectionRecord.id;

        // Prepare existing questions/options for this section
        const existingForThisSection = isCreate
          ? { questions: [] as Array<{ id: string; options: Array<{ id: string }> }> }
          : existingSectionById.get(incomingSection.id) ?? { questions: [] };

        const existingQuestionIdSet = new Set((existingForThisSection.questions || []).map(q => q.id));

        const incomingQuestions = Array.isArray(incomingSection.questions) ? incomingSection.questions : [];
        const incomingQuestionIdSet = new Set(incomingQuestions.map(q => q.id).filter(Boolean));

        // Delete removed questions for this section
        const questionIdsToDelete = (existingForThisSection.questions || [])
          .filter(q => !incomingQuestionIdSet.has(q.id))
          .map(q => q.id);

        if (questionIdsToDelete.length > 0) {
          await tx.option.deleteMany({ where: { questionId: { in: questionIdsToDelete } } });
          await tx.question.deleteMany({ where: { id: { in: questionIdsToDelete } } });
        }

        // Map existing options by question
        const existingOptionsByQuestionId = new Map<string, Set<string>>();
        for (const q of existingForThisSection.questions || []) {
          existingOptionsByQuestionId.set(q.id, new Set((q.options || []).map(o => o.id)));
        }

        // Upsert questions and options
        for (const incomingQuestion of incomingQuestions) {
          const isQuestionCreate = !incomingQuestion.id || incomingQuestion.id.startsWith('temp-') || !existingQuestionIdSet.has(incomingQuestion.id);

          const questionRecord = isQuestionCreate
            ? await tx.question.create({
                data: {
                  type: incomingQuestion.type,
                  text: incomingQuestion.text,
                  correctAnswer: incomingQuestion.correctAnswer ?? null,
                  positiveMarks: incomingQuestion.positiveMarks ?? null,
                  negativeMarks: incomingQuestion.negativeMarks ?? null,
                  sectionId: dbSectionId
                }
              })
            : await tx.question.update({
                where: { id: incomingQuestion.id },
                data: {
                  type: incomingQuestion.type,
                  text: incomingQuestion.text,
                  correctAnswer: incomingQuestion.correctAnswer ?? null,
                  positiveMarks: incomingQuestion.positiveMarks ?? null,
                  negativeMarks: incomingQuestion.negativeMarks ?? null
                }
              });

          const dbQuestionId = questionRecord.id;

          // Text questions should not have options; ensure cleanup
          if (incomingQuestion.type === 'text') {
            await tx.option.deleteMany({ where: { questionId: dbQuestionId } });
            continue;
          }

          const incomingOptions = Array.isArray(incomingQuestion.options) ? incomingQuestion.options : [];
          const existingOptionIdSet = existingOptionsByQuestionId.get(isQuestionCreate ? '' : incomingQuestion.id) || new Set<string>();
          const incomingOptionIdSet = new Set(incomingOptions.map(o => o.id).filter(Boolean));

          // Delete removed options
          if (existingOptionIdSet.size > 0) {
            const optionIdsToDelete = Array.from(existingOptionIdSet).filter(id => !incomingOptionIdSet.has(id));
            if (optionIdsToDelete.length > 0) {
              await tx.option.deleteMany({ where: { id: { in: optionIdsToDelete } } });
            }
          }

          // Upsert options
          for (const incomingOption of incomingOptions) {
            const isOptionCreate = !incomingOption.id || incomingOption.id.startsWith('temp-') || !existingOptionIdSet.has(incomingOption.id);
            if (isOptionCreate) {
              await tx.option.create({
                data: {
                  text: incomingOption.text,
                  isCorrect: !!incomingOption.isCorrect,
                  questionId: dbQuestionId
                }
              });
            } else {
              await tx.option.update({
                where: { id: incomingOption.id },
                data: {
                  text: incomingOption.text,
                  isCorrect: !!incomingOption.isCorrect
                }
              });
            }
          }
        }
      }
    });

    // Return the fresh updated test structure
    const updatedTest = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        sections: {
          include: {
            questions: {
              include: { options: true }
            }
          }
        }
      }
    });

    return NextResponse.json({ message: 'Sections synced successfully', test: updatedTest }, { status: 200 });
  } catch (error) {
    console.error('Error syncing sections:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}


