import { BrowserRouter, Routes, Route } from 'react-router';
import { NavBar } from '@/components/NavBar';
import Home from '@/pages/Home';
import Lineup from '@/pages/Lineup';
import Skills from '@/pages/Skills';
import Battle from '@/pages/Battle';
import Replay from '@/pages/Replay';
import Shop from '@/pages/Shop';
import { useGameStore } from '@/store/useGameStore';
import { useEffect } from 'react';

function App() {
  const { initialize, isInitialized } = useGameStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cyber-darker">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-cyber-cyan/30 animate-ping" />
            <div className="absolute inset-4 rounded-full border-4 border-cyber-purple animate-spin" />
          </div>
          <h2 className="text-2xl font-cyber font-bold text-cyber-cyan animate-pulse">
            NEON COLOSSEUM
          </h2>
          <p className="text-gray-400 mt-2">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-cyber-darker text-white">
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-cyber-purple/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyber-cyan/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyber-pink/3 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/lineup" element={<Lineup />} />
            <Route path="/skills" element={<Skills />} />
            <Route path="/battle" element={<Battle />} />
            <Route path="/battle/:id" element={<Battle />} />
            <Route path="/replay" element={<Replay />} />
            <Route path="/replay/:id" element={<Replay />} />
            <Route path="/shop" element={<Shop />} />
          </Routes>
          <NavBar />
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
