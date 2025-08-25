"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
    const { data: session } = useSession();
    const router = useRouter();

    console.log(session);

    if (!session) {
        router.push("/");
    }
    return (
        <div>
            <div className="flex flex-col items-center justify-center h-screen">
                <h1>Home</h1>
                <p>Welcome {session?.user?.name}</p>
                <p>Email: {session?.user?.email}</p>
                <p>ID: {session?.user?.id}</p>
                <Button onClick={() => {
                router.push("/create-test");
                }}>Create Test</Button>
            </div>
            
        </div>
    );
}