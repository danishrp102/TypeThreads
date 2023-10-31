import { authOptions } from "@/lib/auth";
import NextAuth from "next-auth/next";

export default NextAuth(authOptions);

// const authHandler = NextAuth(authOptions);
// export default async function handler(...params: any[]) {
//     await authHandler(...params);
// }