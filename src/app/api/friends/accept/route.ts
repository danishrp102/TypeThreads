import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { z } from "zod";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const session = await getServerSession(authOptions);

        if (!session) {
            return new Response("Unauthorized", { status: 401 });
        }
        const { id: idToAdd } = z.object({ id: z.string() }).parse(body);


        // verify both users are not already friends
        const isAlreadyFriends = (await fetchRedis(
            'sismember',
            `user:${session.user.id}:friends`,
            idToAdd
        )) as 0 | 1;

        if (isAlreadyFriends) {
            return new Response("Already Friends!", { status: 400 });
        }

        const hasFriendRequest = (await fetchRedis(
            'sismember',
            `user:${session.user.id}:incoming_friend_requests`,
            idToAdd
        )) as 0 | 1;

        if (!hasFriendRequest) {
            return new Response("No friend request", { status: 400 });
        }

        const [userRaw, friendRaw] = (await Promise.all([
            fetchRedis('get', `user:${session.user.id}`),
            fetchRedis('get', `user:${idToAdd}`),
        ])) as [string, string]


        const user = JSON.parse(userRaw) as User
        const friend = JSON.parse(friendRaw) as User

        // notify added user
        await Promise.all([
            await pusherServer.trigger(
                toPusherKey(`user:${idToAdd}:friends`),
                'new_friend',
                user
            ),
            await pusherServer.trigger(
                toPusherKey(`user:${session.user.id}:friends`),
                'new_friend',
                friend
            ),

            db.sadd(`user:${session.user.id}:friends`, idToAdd), // add user to friends list
            db.sadd(`user:${idToAdd}:friends`, session.user.id), // add friend to users list
            db.srem(`user:${session.user.id}:incoming_friend_requests`, idToAdd), // remove the friend req from incoming friend request list
            db.srem(`user:${idToAdd}:outgoing_friend_requests`, session.user.id), // remove the friend request from the other user's outgoing friend requests list
        ])


        // // notify added user
        // pusherServer.trigger(
        //     toPusherKey(`user:${idToAdd}:friends`),
        //     'new_friend',
        //     {}
        // )

        // await db.sadd(`user:${session.user.id}:friends`, idToAdd);

        // await db.sadd(`user:${idToAdd}:friends`, session.user.id);

        // // await db.srem(`user:${idToAdd}:incoming_friend_requests`, session.user.id);
        // // await db.srem(`user:${idToAdd}:outbound_friend_requests`, session.user.id);

        // await db.srem(`user:${session.user.id}:incoming_friend_requests`, idToAdd);

        return new Response("Friend Request Accepted", { status: 200 });
    } catch (error) {

        console.log("/api/friends/accept error: ", error);


        if (error instanceof z.ZodError) {
            return new Response("Invalid request payload", { status: 422 });
        }

        // console.log("/api/friends/accept error:", error);
        return new Response("Invalid Request", { status: 400 });
    }
}