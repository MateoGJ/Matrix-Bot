"use client"

export function Header() {
  return (
    <header className="relative z-20 border-b border-white/5 bg-black/50 backdrop-blur-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded border border-white/10 bg-white/5 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">₿</span>
            </div>
            <h1 className="text-xl font-black text-white tracking-widest uppercase">
              MyRobo<span className="text-gray-500">Trader</span>
            </h1>
          </div>

          <div className="flex items-center space-x-2 text-[10px] text-green-500 font-bold uppercase tracking-widest border border-green-500/20 bg-green-500/10 px-3 py-1.5 rounded">
            <span className="animate-pulse h-1.5 w-1.5 bg-green-500 rounded-full mr-1"></span>
            Uplink Active
          </div>

        </div>
      </div>
    </header>
  )
}