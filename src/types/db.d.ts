interface User {
    name: string
    email: string
    image: string
    id: string
}

interface Chat {
    id: string
    messages: Message[]
    lastMessage: string // to be contd..
}

interface Message {
    id: string
    senderId: string
    receiverId: string
    text: string
    timestamp: number // unix timestamp
}

interface FriendRequest {
    id: string
    senderId: string
    receiverId: string
    timestamp: number // to be contd..
}