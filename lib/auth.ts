import { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";

interface ExtendedUser extends User {
  rol: Rol;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/giris" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-posta", type: "email" },
        sifre: { label: "Şifre", type: "password" },
      },
      async authorize(credentials): Promise<ExtendedUser | null> {
        if (!credentials?.email || !credentials?.sifre) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.aktif) return null;

        const sifreDogruMu = await bcrypt.compare(credentials.sifre, user.sifreHash);
        if (!sifreDogruMu) return null;

        return { id: user.id, name: user.ad, email: user.email, rol: user.rol };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: ExtendedUser | User }) {
      if (user) token.rol = (user as ExtendedUser).rol;
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.rol = token.rol;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
