import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:3001';

export const socket = io(SOCKET_SERVER_URL);

export const joinRoom = (roomName: string, userName: string) => {
  socket.emit('join-room', { roomName, userName });
};

export const sendOffer = (target: string, offer: any, caller: string) => {
  socket.emit('offer', { target, offer, caller });
};

export const sendAnswer = (target: string, answer: any) => {
  socket.emit('answer', { target, answer });
};

export const sendIceCandidate = (target: string, candidate: any) => {
  socket.emit('ice-candidate', { target, candidate });
};
