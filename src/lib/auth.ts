import { NextAuthOptions } from "next-auth";
import { UpstashRedisAdapter } from "@next-auth/upstash-redis-adapter";
import { db } from "./db";
import GoogleProvider from "next-auth/providers/google"
import { fetchRedis } from "@/helpers/redis";

function getGoogleCredentials() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || clientId.length === 0) {
        throw new Error("Missing GOOGLE_CLIENT_ID");
    }

    if (!clientSecret || clientSecret.length === 0) {
        throw new Error("Missing GOOGLE_CLIENT_SECRET");
    }

    return { clientId, clientSecret };
}

export const authOptions: NextAuthOptions = {
    adapter: UpstashRedisAdapter(db),  // user data gets added to the db automatically
    session: {
        strategy: 'jwt'
    },
    pages: {
        signIn: '/login'
    },
    providers: [
        GoogleProvider({
            clientId: getGoogleCredentials().clientId,
            clientSecret: getGoogleCredentials().clientSecret,
            // checks: ['none'], // avoids [OAUTH_CALLBACK_ERROR]

            // callbackUrl: '/dashboard'

            // authorization: {
            //     params: {
            //         prompt: 'consent',
            //         access_type: 'offline',
            //         response_type: 'code'
            //     }
            // }
        }),
    ],
    callbacks: {

        // async jwt({ token, user, session }) {
        //     // console.log("JWT callback: ", { token, user, session });

        //     // pass in the id to the token to be returned. This will be used by the async session
        //     if (user) {
        //         return {
        //             ...token,
        //             id: user.id,
        //         }
        //     }

        //     return token;
        // },

        // async session({ session, token, user }) {
        //     // console.log("Session callback: ", { token, user, session });

        //     // pass in userId to the session
        //     return {
        //         ...session,
        //         user: {
        //             ...session.user,
        //             id: token.id,
        //         }
        //     };

        //     return session;
        // },

        async jwt({ token, user }) {
            // const dbUser = (await db.get(`user:${token.id}`)) as User | null
            const dbUserResult = await fetchRedis('get', `user:${token.id}`) as
                | string
                | null;


            if (!dbUserResult) {
                if (user) {
                    token.id = user!.id
                }

                return token;
            }

            const dbUser = JSON.parse(dbUserResult) as User;

            return {
                id: dbUser.id,
                name: dbUser.name,
                email: dbUser.email,
                picture: dbUser.image,
            }
        },

        async session({ session, token }) {
            if (token) {
                session.user.id = token.id
                session.user.name = token.name
                session.user.email = token.email
                session.user.image = token.picture
            }

            return session;
        },

        redirect() { // redirect when the user has signed in
            return '/dashboard'
        }
    },

    secret: process.env.NEXTAUTH_SECRET,
}