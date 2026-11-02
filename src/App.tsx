import { Metronome } from "@/components/Metronome";

function App() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <h1 className="text-3xl font-semibold">節拍器</h1>
      <Metronome />
    </main>
  );
}

export default App;
