export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center font-sans text-zinc-100 p-6">
      <div className="max-w-2xl w-full flex flex-col items-center space-y-8 bg-zinc-900 border border-zinc-800 rounded-3xl p-10 shadow-2xl">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Análisis de Sentimientos
          </h1>
          <p className="text-zinc-400 text-lg">
            Plataforma impulsada por Inteligencia Artificial
          </p>
        </div>

        {/* Placeholder para la App */}
        <div className="w-full bg-zinc-950 rounded-xl p-8 border border-zinc-800 text-center">
          <span className="text-5xl mb-4 block">🚀</span>
          <h2 className="text-xl font-semibold mb-2">¡Sistemas en línea!</h2>
          <p className="text-zinc-500 text-sm">
            La conexión con Render y MongoDB Atlas está lista. 
            Pronto aquí construiremos la caja de texto para analizar las reseñas.
          </p>
        </div>

      </div>
    </div>
  );
}
