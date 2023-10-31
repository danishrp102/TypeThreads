import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";
import { Message, messageValidator } from "@/lib/validations/messages";
import { nanoid } from "nanoid";
import { getServerSession } from "next-auth";
import { z } from "zod";

export async function POST(req: Request, res: Response) {
    try {
        const { text, chatId }: { text: string; chatId: string } = await req.json();
        const session = await getServerSession(authOptions);

        if (!session) return new Response("Please Login to send a message", { status: 401 });

        const [userId1, userId2] = chatId.split('--');

        if (session.user.id !== userId1 && session.user.id !== userId2) {
            return new Response("Unauthorized", { status: 401 });
        }

        const friendId = (session.user.id === userId1) ? userId2 : userId1;
        // const friendList = await fetchRedis("smembers", `user:${session.user.id}:friends`) as string[];
        // const isFriend = friendList.includes(friendId);
        // if (!isFriend) {
        //     return new Response("Unauthorized", { status: 401 });
        // }

        const friendList = await fetchRedis(
            "sismember",
            `user:${session.user.id}:friends`,
            friendId
        ) as boolean;


        if (!friendList) {
            return new Response('You are not friends with this user', { status: 401 });
        }


        const rawSender = (await fetchRedis(
            "get",
            `user:${session.user.id}`
        )) as string;
        const sender = JSON.parse(rawSender) as User;

        const timestamp = Date.now(); // UNIX number
        const messageData: Message = {
            id: nanoid(), // nanoid generates an id to uniquely identify each message
            senderId: session.user.id,
            text,
            timestamp
        }

        const message = messageValidator.parse(messageData);

        // before persisting the message in the db, notify all connected chatroom clients beforehand
        await pusherServer.trigger(
            toPusherKey(`chat:${chatId}`),
            'incoming-message',
            message
        );

        await pusherServer.trigger(
            toPusherKey(`user:${friendId}:chats`),
            'new_message',
            {
                ...message,
                senderImg: sender.image,
                senderName: sender.name,
            }
        )

        // all valid, send the message to the friend
        await db.zadd(`chat:${chatId}:messages`, { // zadd -> add to a sorted list
            score: timestamp,
            member: JSON.stringify(message)
        })

        return new Response("Message sent!", { status: 200 });
    } catch (error) {

        if (error instanceof z.ZodError) {
            return new Response(error.message, { status: 400 });
        }

        if (error instanceof Error) {
            return new Response(error.message, { status: 500 });
        }

        console.log("message/send error: ", error);
        return new Response("Internal server error", { status: 500 });
    }
}