"use client";
import React, { useState, useEffect, useCallback } from 'react';
                import { generateClient } from '@aws-amplify/api';
// Define types for your GraphQL operations
interface Room {
  id: string;
  code: string;
  updatedAt: string;
  participants?: string[];
}

interface GetRoomQuery {
  getRoom: Room | null;
}

interface CreateRoomMutation {
  createRoom: Room;
}

interface UpdateRoomMutation {
  updateRoom: Room;
}

interface OnRoomUpdatedSubscription {
  onRoomUpdated: Room;
}

// GraphQL operations
const getRoomQuery = /* GraphQL */ `
  query GetRoom($id: ID!) {
    getRoom(id: $id) {
      id
      code
      updatedAt
      participants
    }
  }
`;

const createRoomMutation = /* GraphQL */ `
  mutation CreateRoom($id: ID!, $code: String, $participants: [String]) {
    createRoom(id: $id, code: $code, participants: $participants) {
      id
      code
      updatedAt
      participants
    }
  }
`;

const updateRoomMutation = /* GraphQL */ `
  mutation UpdateRoom($id: ID!, $code: String) {
    updateRoom(id: $id, code: $code) {
      id
      code
      updatedAt
    }
  }
`;

const onRoomUpdatedSubscription = /* GraphQL */ `
  subscription OnRoomUpdated($id: ID!) {
    onRoomUpdated(id: $id) {
      id
      code
      updatedAt
    }
  }
`;

const client = generateClient();

const RoomEditor = () => {
    const [roomId, setRoomId] = useState('');
    const [code, setCode] = useState('');
    const [isInRoom, setIsInRoom] = useState(false);

    const createRoom = async () => {
        const newRoomId = Math.random().toString(36).substring(2, 8);
        try {
            const result = await client.graphql({
                query: createRoomMutation,
                variables: {
                    id: newRoomId,
                    code: '',
                    participants: [],
                }
            }) as { data: CreateRoomMutation };

            console.log('Room created:', result);
            setRoomId(newRoomId);
            setIsInRoom(true);
        } catch (error) {
            console.error('Error creating room:', error);
        }
    };

    const joinRoom = async (id: string) => {
        try {
            const result = await client.graphql({
                query: getRoomQuery,
                variables: { id }
            }) as { data: GetRoomQuery };

            if (result.data.getRoom) {
                console.log('Joined room:', result.data.getRoom);
                setRoomId(result.data.getRoom.id);
                setCode(result.data.getRoom.code);
                setIsInRoom(true);
            }
        } catch (error) {
            console.error('Error joining room:', error);
        }
    };



    const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newCode = e.target.value;
        setCode(newCode);
    };

    // useEffect(() => {
    //     let subscription: { unsubscribe: () => void } | undefined;
    //     if (roomId) {
    //         // Wrap your subscription query with graphqlOperation to get an Observable
    //         const observable = API.graphql({
    //             query: onRoomUpdatedSubscription,
    //             variables: { id: roomId },
    //         });
    //
    //         subscription = (observable as any).subscribe({
    //             next: (result: any) => {
    //                 const updatedRoom = result.value.data.onRoomUpdated;
    //                 console.log('Realtime update received:', updatedRoom);
    //                 if (updatedRoom.code !== code) {
    //                     setCode(updatedRoom.code);
    //                 }
    //             },
    //             error: (error: any) => console.error('Subscription error:', error),
    //         });
    //     }
    //     return () => {
    //         if (subscription) subscription.unsubscribe();
    //     };
    // }, [roomId, code]);
    return (
        <div style={{ padding: '20px' }}>
            {!isInRoom ? (
                <div>
                    <h2>Create or Join a Room</h2>
                    <button onClick={createRoom}>Create Room</button>
                    <div style={{ marginTop: '10px' }}>
                        <input
                            type="text"
                            placeholder="Enter room ID"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                        />
                        <button onClick={() => joinRoom(roomId)}>Join Room</button>
                    </div>
                </div>
            ) : (
                <div>
                    <h2>Room: {roomId}</h2>
                    <textarea
                        value={code}
                        onChange={handleCodeChange}
                        rows={10}
                        cols={50}
                        style={{ fontFamily: 'monospace', fontSize: '14px' }}
                    />
                </div>
            )}
        </div>
    );
};

export default RoomEditor;