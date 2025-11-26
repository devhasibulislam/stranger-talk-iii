import React, { useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;
`;

const FormContainer = styled.div`
  background-color: white;
  border-radius: 10px;
  padding: 30px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
`;

const Title = styled.h1`
  text-align: center;
  color: #333;
  margin-bottom: 30px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const Label = styled.label`
  font-weight: bold;
  color: #555;
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
`;

const Button = styled.button`
  padding: 12px;
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #3367d6;
  }
`;

interface HomeProps {
  onJoinRoom: (roomName: string, userName: string) => void;
}

const Home: React.FC<HomeProps> = ({ onJoinRoom }) => {
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName && userName) {
      onJoinRoom(roomName, userName);
    }
  };

  return (
    <Container>
      <FormContainer>
        <Title>Join Video Chat</Title>
        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <Label htmlFor="userName">Your Name</Label>
            <Input
              id="userName"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              required
            />
          </InputGroup>
          <InputGroup>
            <Label htmlFor="roomName">Room Name</Label>
            <Input
              id="roomName"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter room name"
              required
            />
          </InputGroup>
          <Button type="submit">Join Room</Button>
        </Form>
      </FormContainer>
    </Container>
  );
};

export default Home;
