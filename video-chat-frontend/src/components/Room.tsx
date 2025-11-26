import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { socket, joinRoom, sendOffer, sendAnswer, sendIceCandidate } from '../services/socket';
import { PeerConnection, getUserMedia } from '../services/webrtc';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
`;

const VideoContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
`;

const VideoWrapper = styled.div`
  width: 400px;
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
`;

const Video = styled.video`
  width: 100%;
  height: 300px;
  object-fit: cover;
  background-color: #1a1a1a;
`;

const UserLabel = styled.div`
  position: absolute;
  bottom: 10px;
  left: 10px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 14px;
`;

const Controls = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 20px;
  gap: 10px;
`;

const Button = styled.button`
  padding: 10px 15px;
  border-radius: 5px;
  border: none;
  background-color: #4a4a4a;
  color: white;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #666;
  }
  
  &.leave {
    background-color: #e74c3c;
  }
  
  &.leave:hover {
    background-color: #c0392b;
  }
`;

interface RoomProps {
  roomName: string;
  userName: string;
  onLeaveRoom: () => void;
}

interface Peer {
  id: string;
  name?: string;
  connection: PeerConnection;
  stream?: MediaStream;
}

const Room: React.FC<RoomProps> = ({ roomName, userName, onLeaveRoom }) => {
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  
  // Initialize media and join room
  useEffect(() => {
    const initializeRoom = async () => {
      try {
        // Get local media
        const stream = await getUserMedia();
        setLocalStream(stream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        // Join the room
        joinRoom(roomName, userName);
      } catch (error) {
        console.error('Error initializing room:', error);
      }
    };
    
    initializeRoom();
    
    // Clean up on component unmount
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      // Close all peer connections
      peers.forEach(peer => {
        peer.connection.close();
      });
      
      socket.off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Socket event listeners
  useEffect(() => {
    // Debug socket connection
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // When a new user joins the room
    socket.on('user-joined', async ({ userId, userName: peerName }) => {
      console.log(`User ${peerName} (${userId}) joined the room`);
      
      if (localStream) {
        // Create new peer connection
        const peerConnection = new PeerConnection(
          (candidate) => {
            sendIceCandidate(userId, candidate);
          },
          (stream) => {
            setPeers(prev => {
              const updated = new Map(prev);
              const peer = updated.get(userId);
              if (peer) {
                peer.stream = stream;
                updated.set(userId, peer);
              }
              return updated;
            });
          }
        );
        
        await peerConnection.setLocalStream(localStream);
        
        // Create offer
        const offer = await peerConnection.createOffer();
        sendOffer(userId, offer, socket.id || '');
        
        // Add to peers list
        setPeers(prev => {
          const updated = new Map(prev);
          updated.set(userId, {
            id: userId,
            name: peerName,
            connection: peerConnection
          });
          return updated;
        });
      }
    });
    
    // When receiving the list of users already in the room
    socket.on('room-users', (userIds: string[]) => {
      console.log('Users in room:', userIds);
    });
    
    // When receiving an offer from another peer
    socket.on('offer', async ({ offer, caller }) => {
      console.log('Received offer from:', caller);
      
      if (localStream) {
        // Create new peer connection
        const peerConnection = new PeerConnection(
          (candidate) => {
            sendIceCandidate(caller, candidate);
          },
          (stream) => {
            setPeers(prev => {
              const updated = new Map(prev);
              const peer = updated.get(caller);
              if (peer) {
                peer.stream = stream;
                updated.set(caller, peer);
              }
              return updated;
            });
          }
        );
        
        await peerConnection.setLocalStream(localStream);
        
        // Create answer
        const answer = await peerConnection.createAnswer(offer);
        sendAnswer(caller, answer);
        
        // Add to peers list
        setPeers(prev => {
          const updated = new Map(prev);
          updated.set(caller, {
            id: caller,
            connection: peerConnection
          });
          return updated;
        });
      }
    });
    
    // When receiving an answer to our offer
    socket.on('answer', async ({ answer, answerer }) => {
      console.log('Received answer from:', answerer);
      
      const peer = peers.get(answerer);
      if (peer) {
        await peer.connection.setRemoteAnswer(answer);
      }
    });
    
    // When receiving an ICE candidate
    socket.on('ice-candidate', ({ candidate, sender }) => {
      console.log('Received ICE candidate from:', sender);
      
      const peer = peers.get(sender);
      if (peer) {
        peer.connection.addIceCandidate(candidate);
      }
    });
    
    // When a user disconnects
    socket.on('user-disconnected', (userId) => {
      console.log('User disconnected:', userId);
      
      const peer = peers.get(userId);
      if (peer) {
        peer.connection.close();
        setPeers(prev => {
          const updated = new Map(prev);
          updated.delete(userId);
          return updated;
        });
      }
    });
    
    return () => {
      socket.off('user-joined');
      socket.off('room-users');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('user-disconnected');
    };
  }, [peers, localStream, roomName]);
  
  const handleLeaveRoom = () => {
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Close all peer connections
    peers.forEach(peer => {
      peer.connection.close();
    });
    
    // Disconnect socket
    socket.disconnect();
    
    // Call the parent component callback
    onLeaveRoom();
  };
  
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
    }
  };
  
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
    }
  };
  
  return (
    <Container>
      <h2>Room: {roomName}</h2>
      
      <VideoContainer>
        {/* Local video */}
        <VideoWrapper>
          <Video ref={localVideoRef} autoPlay muted playsInline />
          <UserLabel>You ({userName})</UserLabel>
        </VideoWrapper>
        
        {/* Remote videos */}
        {Array.from(peers.values()).map(peer => (
          peer.stream && (
            <VideoWrapper key={peer.id}>
              <Video
                autoPlay
                playsInline
                ref={el => {
                  if (el && peer.stream) {
                    el.srcObject = peer.stream;
                  }
                }}
              />
              <UserLabel>{peer.name || 'Peer'}</UserLabel>
            </VideoWrapper>
          )
        ))}
      </VideoContainer>
      
      <Controls>
        <Button onClick={toggleMute}>Toggle Mute</Button>
        <Button onClick={toggleVideo}>Toggle Video</Button>
        <Button className="leave" onClick={handleLeaveRoom}>Leave Room</Button>
      </Controls>
    </Container>
  );
};

export default Room;
