// src/lib/authOptions.ts
import { AuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import prisma from "@/lib/prisma"

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }: any) {
      if (account && profile && profile.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: profile.email },
        })

        if (!existingUser) {
          const newUser = await prisma.user.create({
            data: {
              name: profile.name,
              email: profile.email,
              image: profile.picture,
            },
          })
          token.id = newUser.id
        } else {
          token.id = existingUser.id
        }

        token.email = profile.email
        token.name = profile.name
        token.picture = profile.picture
      }

      return token
    },

    async session({ session, token }: any) {
      if (session.user && token?.id) {
        session.user.id = token.id
        session.user.email = token.email
        session.user.name = token.name
        session.user.image = token.picture
      }
      return session
    },
  },
  session: {
    strategy: "jwt",
  },
}