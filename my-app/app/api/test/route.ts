import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { title, description, availabilityStart, availabilityEnd, totalDuration } = await req.json();

        const test = await prisma.test.create({
            data: {
                title,
                description,
                availabilityStart,
                availabilityEnd,
                totalDuration,
                creator: {
                    connect: {
                        id: session.user.id
                    }
                }
            }
        })

        return NextResponse.json({ message: "Test created successfully", test }, { status: 200 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

