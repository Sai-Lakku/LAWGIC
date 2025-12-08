// law_as_code_chatbot/src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectDB from "@/lib/databse_user/db";
import { User } from "@/lib/databse_user/user";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  // Configure one or more authentication providers
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // 1. Check if input exists
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter an email and password");
        }

        // 2. Connect to Database
        await connectDB();

        // 3. Find user
        const user = await User.findOne({ email: credentials.email });
        if (!user) {
          throw new Error("No user found with this email");
        }

        // 4. Check Password
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Invalid password");
        }

        // 5. Return user object (this will be saved in the session)
        return { 
          id: user._id.toString(), 
          email: user.email, 
          name: user.name 
        };
      },
    }),
  ],
  callbacks: {
    // Add user ID to the session so we can use it in the UI/Chat
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    }
  },
  session: {
    strategy: "jwt",
  },
  // IMPORTANT: Tell NextAuth where our custom login page is
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };