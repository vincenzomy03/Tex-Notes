import React from 'react';

export default function App() {
  return (
    <div className="app-container">
      <header className="glass-panel" style={{ height: 'var(--topbar-height)', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
        <strong>Tex-Notes</strong>
      </header>
      <main className="main-content">
        <div style={{ padding: 20 }}>Caricamento Tex-Notes...</div>
      </main>
    </div>
  );
}
