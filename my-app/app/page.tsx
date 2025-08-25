"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
    const { data: session } = useSession();
    const router = useRouter();

    if (session) {
        router.push("/home");
    }

    return (
        <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
            <h1>Hello World</h1>
            <Button onClick={() => signIn("google")}>Login</Button>
        </div>
    );
}
