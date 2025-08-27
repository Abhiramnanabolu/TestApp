import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: testId } = await params;

    if (!testId) {
      return NextResponse.json({ message: "Test ID is required" }, { status: 400 });
    }

    const test = await prisma.test.findUnique({
        where: {
            id: testId,
        },
        include: {
            sections: {
                include: {
                    questions: {
                        include: {
                            options: true
                        }
                    }
                }
            }
        },
    });

    if (!test) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Test fetched successfully", test },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching test:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: testId } = await params;
    const body = await req.json();

    if (!testId) {
      return NextResponse.json({ message: "Test ID is required" }, { status: 400 });
    }

    // Validate dates
    const now = new Date();
    const start = body.availabilityStart ? new Date(body.availabilityStart) : null;
    const end = body.availabilityEnd ? new Date(body.availabilityEnd) : null;

    if (!start || !end) {
      return NextResponse.json({ message: "Both start and end dates are required" }, { status: 400 });
    }

    if (start < now) {
      return NextResponse.json({ message: "Start date must be in the future" }, { status: 400 });
    }

    if (end < now) {
      return NextResponse.json({ message: "End date must be in the future" }, { status: 400 });
    }

    if (start >= end) {
      return NextResponse.json({ message: "Start date must be before end date" }, { status: 400 });
    }

    // Validate duration against time window
    const timeWindow = end.getTime() - start.getTime();
    const timeWindowInMinutes = timeWindow / (1000 * 60);
    if (body.totalDuration && body.totalDuration > timeWindowInMinutes) {
      return NextResponse.json({ message: "Test duration cannot be longer than the available time window" }, { status: 400 });
    }

    // Check if test exists and user owns it
    const existingTest = await prisma.test.findFirst({
      where: {
        id: testId,
        createdBy: session.user.id
      }
    });

    if (!existingTest) {
      return NextResponse.json({ message: "Test not found or access denied" }, { status: 404 });
    }

    // Update test details
    const updatedTest = await prisma.test.update({
      where: { id: testId },
      data: {
        title: body.title,
        description: body.description,
        availabilityStart: body.availabilityStart ? new Date(body.availabilityStart) : undefined,
        availabilityEnd: body.availabilityEnd ? new Date(body.availabilityEnd) : undefined,
        totalDuration: body.totalDuration,
        shuffleQuestions: body.shuffleQuestions,
        allowSectionNav: body.allowSectionNav,
        negativeMarking: body.negativeMarking,
        showResultsInstant: body.showResultsInstant,
        status: body.status,
        updatedAt: new Date()
      },
      include: {
        sections: {
          include: {
            questions: {
              include: {
                options: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(
      { message: "Test updated successfully", test: updatedTest },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating test:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: testId } = await params;

    if (!testId) {
      return NextResponse.json({ message: "Test ID is required" }, { status: 400 });
    }

    // Check if test exists and user owns it
    const existingTest = await prisma.test.findFirst({
      where: {
        id: testId,
        createdBy: session.user.id
      }
    });

    if (!existingTest) {
      return NextResponse.json({ message: "Test not found or access denied" }, { status: 404 });
    }

    // Delete test (cascade will handle sections, questions, options)
    await prisma.test.delete({
      where: { id: testId }
    });

    return NextResponse.json(
      { message: "Test deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting test:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}