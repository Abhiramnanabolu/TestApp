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
