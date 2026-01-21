import React from 'react';

const App: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-black text-teal-600 tracking-tighter">ZindraERP</h1>
        <p className="text-xl text-slate-600">Carregando a aplicação...</p>
        <div className="flex items-center justify-center gap-3">
          <div className="w-3 h-3 bg-teal-600 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
          <div className="w-3 h-3 bg-teal-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          <div className="w-3 h-3 bg-teal-600 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
        </div>
      </div>
    </div>
  );
};

export default App;
