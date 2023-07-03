import React, { useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { findAvailableAgentUser, storeAgentUserId, checkAgentUser } from './TabsBroadcaster';
import logo from './logo.svg';
import './App.css';

function App() {
  useEffect(() => {
    find()
  }, [])


  async function find() {
    try {
      const agentId = await findAvailableAgentUser();

      // ...
      // const isAvailable = checkAgentUser(agentId);
      // ...
    } catch (error) {
      // 全部不可用，主动生成一个
      const agentId = uuidv4();
      storeAgentUserId(agentId)
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
