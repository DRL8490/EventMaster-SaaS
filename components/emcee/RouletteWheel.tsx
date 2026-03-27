import { useState } from 'react';

// 1. Define exactly what props TypeScript should expect
interface RouletteWheelProps {
  guests: any[]; 
  winner?: any;
}

// 2. Apply the interface to the component
export default function RouletteWheel({ guests, winner }: RouletteWheelProps) {
  const [spinning, setSpinning] = useState(false);

  // Generates a colorful striped background based on guest count
  const colors = ['#FF4136', '#FF851B', '#FFDC00', '#2ECC40', '#0074D9', '#B10DC9'];
  const sliceSize = 100 / (guests?.length || 1);
  const conicString = (guests || []).map((_, i) => `${colors[i % colors.length]} ${i * sliceSize}% ${(i + 1) * sliceSize}%`).join(', ');

  const handleSpin = () => {
    setSpinning(true);
    // Add your sound effect trigger here!
    setTimeout(() => {
      setSpinning(false);
      // Show winner modal here
    }, 5000); // Spins for 5 seconds
  };

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative w-96 h-96">
        {/* The Wheel */}
        <div 
          className={`w-full h-full rounded-full border-8 border-white shadow-2xl transition-transform duration-[5000ms] ease-out ${spinning ? 'rotate-[3600deg]' : ''}`}
          style={{ background: `conic-gradient(${conicString})` }}
        />
        {/* The Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-white z-10" />
      </div>

      <button onClick={handleSpin} className="mt-12 bg-white text-black px-12 py-4 rounded-full font-black text-2xl shadow-lg hover:scale-105 transition">
        SPIN THE WHEEL
      </button>
    </div>
  );
}