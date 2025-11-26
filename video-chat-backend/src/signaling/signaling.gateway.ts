/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

interface Room {
  id: string;
  name: string;
  users: string[];
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false,
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
})
export class SignalingGateway {
  @WebSocketServer()
  server: Server;

  private rooms: Room[] = [];
  private socketToRoom = new Map<string, string>();

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomName: string; userName: string },
  ) {
    const { roomName, userName } = data;

    // Find room or create if it doesn't exist
    let room = this.rooms.find((r) => r.name === roomName);
    if (!room) {
      room = { id: uuidv4(), name: roomName, users: [] };
      this.rooms.push(room);
    }

    // Add user to room
    room.users.push(client.id);
    this.socketToRoom.set(client.id, room.id);

    // Join socket.io room
    client.join(room.id);

    // Notify other users in the room
    client.to(room.id).emit('user-joined', {
      userId: client.id,
      userName,
    });

    // Send list of existing users to the new user
    const usersInRoom = room.users.filter((id) => id !== client.id);
    client.emit('room-users', usersInRoom);

    console.log(`User ${userName} (${client.id}) joined room ${roomName}`);
  }

  @SubscribeMessage('offer')
  handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { target: string; offer: any; caller: string },
  ) {
    const { target, offer, caller } = data;
    this.server.to(target).emit('offer', { offer, caller });
  }

  @SubscribeMessage('answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { target: string; answer: any },
  ) {
    const { target, answer } = data;
    this.server.to(target).emit('answer', { answer, answerer: client.id });
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { target: string; candidate: any },
  ) {
    const { target, candidate } = data;
    this.server.to(target).emit('ice-candidate', {
      candidate,
      sender: client.id,
    });
  }

  handleDisconnect(client: Socket) {
    // Find which room the user was in
    const roomId = this.socketToRoom.get(client.id);
    if (roomId) {
      // Find the room
      const roomIndex = this.rooms.findIndex((r) => r.id === roomId);
      if (roomIndex >= 0) {
        // Remove user from the room
        const room = this.rooms[roomIndex];
        room.users = room.users.filter((id) => id !== client.id);

        // If room is empty, remove it
        if (room.users.length === 0) {
          this.rooms.splice(roomIndex, 1);
        } else {
          // Notify other users about the disconnection
          client.to(roomId).emit('user-disconnected', client.id);
        }
      }

      // Remove from mapping
      this.socketToRoom.delete(client.id);
    }

    console.log(`User ${client.id} disconnected`);
  }
}
