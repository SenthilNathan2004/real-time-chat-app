import { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import EmojiPicker from "emoji-picker-react";
import "./index.css";

function App() {
  const [joined, setJoined] = useState(false);
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);

  const socketRef = useRef(null);
  const messageEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const joinChat = () => {
    if (!username.trim() || !room.trim()) return;

    socketRef.current = io("http://localhost:5001");

    socketRef.current.emit("joinRoom", { username, room }, (res) => {
      if (!res.error) setJoined(true);
    });

    socketRef.current.on("users", (list) => setUsers(list));
    socketRef.current.on("message", (msg) =>
      setMessages((prev) => [...prev, msg])
    );

    socketRef.current.on("typing", (user) => {
      setTypingUser(user);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTypingUser(""), 2000);
    });
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    socketRef.current.emit("sendMessage", { username, message, room });
    setMessage("");
    setShowEmoji(false);
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    socketRef.current.emit("typing", { username, room });
  };

  const logout = () => {
    socketRef.current?.disconnect();
    setJoined(false);
    setMessages([]);
    setUsers([]);
    setUsername("");
    setRoom("");
  };

  const getInitial = (name) => name.charAt(0).toUpperCase();

  return !joined ? (
    <div className="login-wrapper">
      <div className="login-card">
        <h2>Welcome to Chat</h2>
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          placeholder="Room"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
        />
        <button onClick={joinChat}>Join Now</button>
      </div>
    </div>
  ) : (
    <div className="chat-wrapper">
      <div className="sidebar">
        <h3>{room}</h3>
        {users.map((u, i) => (
          <div key={i} className="user-row">
            <div className="avatar">{getInitial(u)}</div>
            <span>{u}</span>
          </div>
        ))}
      </div>

      <div className="chat-area">
        <div className="chat-header">
          <div className="avatar large">{getInitial(username)}</div>
          <span>{username}</span>
          <button onClick={logout}>Logout</button>
        </div>

        <div className="messages">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`msg ${
                msg.username === username ? "me" : "other"
              }`}
            >
              {msg.username !== username && (
                <div className="msg-user">
                  <div className="avatar small">
                    {getInitial(msg.username)}
                  </div>
                  <strong>{msg.username}</strong>
                </div>
              )}
              <div className="msg-text">{msg.message}</div>
            </div>
          ))}

          {typingUser && typingUser !== username && (
            <div className="typing">{typingUser} is typing...</div>
          )}

          <div ref={messageEndRef} />
        </div>

        <div className="input-area">
          <button onClick={() => setShowEmoji(!showEmoji)}>😊</button>
          <input
            value={message}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type message..."
          />
          <button onClick={sendMessage}>Send</button>
        </div>

        {showEmoji && (
          <div className="emoji-box">
            <EmojiPicker
              onEmojiClick={(emoji) =>
                setMessage((prev) => prev + emoji.emoji)
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;