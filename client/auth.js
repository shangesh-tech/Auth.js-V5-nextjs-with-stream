import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Github from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { connectDB } from "@/lib/config/db";
import { User } from "./lib/models/User";
import { compare } from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Github({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember me", type: "checkbox" },
      },
      authorize: async (credentials) => {
        const email = credentials.email || "";
        const password = credentials.password || "";


        if (!email || !password) {
          throw new CredentialsSignin("Please provide both email & password");
        }

        await connectDB();

        const user = await User.findOne({ email }).select("+password +role");

        if (!user) {
          throw new Error("Invalid email or password");
        }

        if (!user.password) {
          throw new Error("Invalid email or password");
        }

        const isMatched = await compare(password, user.password);

        if (!isMatched) {
          throw new Error("Password did not matched");
        }

        const userData = {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          id: user._id,
        };

        return userData;
      },
    }),
  ],
  pages: {
    signIn: "/login",
    signOut: "/",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // Default 24 hours
  },
  callbacks: {
    async session({ session, token }) {
      if(token?.sub) {
        session.user.id = token.sub;
      }
      if (token?.email) {
        session.user.email = token.email;
      }
      if (token?.role) {
        session.user.role = token.role;
      }
      if (token?.firstName) {
        session.user.firstName = token.firstName;
      }
      if (token?.lastName) {
        session.user.lastName = token.lastName;
      }
      if (token?.gender) {
        session.user.gender = token.gender;
      }
      return session;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.gender = user.gender;
      }
      if (trigger === "signIn" && account?.type === "credentials") {
        if (session?.remember === "true") {
          token.maxAge = 30 * 24 * 60 * 60; // 30 days for remember me
        }
      }
      return token;
    },
    async signIn({ user, account }) {
        
      if (account?.provider === "google" || account?.provider === "github") {
        try {
          const { email, name, image, id } = user;
          await connectDB();
          const existingUser = await User.findOne({ email });

          if (!existingUser) {
            const [firstName, ...lastNameParts] = name.split(" ");
            await User.create({
              firstName: firstName || name,
              lastName: lastNameParts.join(" ") || "",
              email,
              image,
              authProviderId: id,
              authProvider: account.provider,
              role: "user",
            });
          } else {
            await User.findOneAndUpdate(
              { email },
              {
                image: image || existingUser.image,
                authProviderId: id,
                authProvider: account.provider,
                firstName: existingUser.firstName || name.split(" ")[0],
                lastName: existingUser.lastName || name.split(" ").slice(1).join(" ") || "",
              }
            );
          }
          return true;
        } catch (error) {
          throw new Error(error.message || "Error during authentication");
        }
      }

      if (account?.provider === "credentials") {
        return true;
      }

      return false;
    }
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        domain: "localhost", // Explicit for local dev
        secure: process.env.NODE_ENV === "production", // False in dev
        maxAge: 24 * 60 * 60, // Sync with default session maxAge
      },
    },
  },
});
