// client/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';

// 1. Import AppWrapper, NOT App
import AppWrapper from './App.jsx';

import './index.css';

ReactDOM.createRoot (document.getElementById ('root')).render (
  <React.StrictMode>
    {/* 2. Render AppWrapper here */}
    <AppWrapper />
  </React.StrictMode>
);
