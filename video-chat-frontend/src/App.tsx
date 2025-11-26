import React, { useState } from 'react';
import Home from './components/Home';
import Room from './components/Room';

const App: React.FC = () => {
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');

  const handleJoinRoom = (room: string, user: string) => {
    setRoomName(room);
    setUserName(user);
    setIsInRoom(true);
  };

  const handleLeaveRoom = () => {
    setIsInRoom(false);
  };

  return (
    <div className="App">
      {isInRoom ? (
        <Room
          roomName={roomName}
          userName={userName}
          onLeaveRoom={handleLeaveRoom}
        />
      ) : (
        <Home onJoinRoom={handleJoinRoom} />
      )}
    </div>
  );
};

export default App;
