import React from "react";
import { Link } from "wouter";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-4 relative">
       <div className="absolute inset-0 pointer-events-none z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
          alt="" 
          className="w-full h-full object-cover opacity-20 object-top mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background" />
      </div>

      <div className="relative z-10">
        <h1 className="text-8xl font-display font-black text-primary mb-4 drop-shadow-[0_0_15px_rgba(229,9,20,0.5)]">404</h1>
        <h2 className="text-3xl font-display font-bold text-foreground mb-4">Scene Not Found</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          The page you're looking for has been cut from the script. Let's get you back to the main stage.
        </p>
        
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 hover:scale-105 transition-all shadow-lg shadow-primary/30"
        >
          <Home className="w-5 h-5" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
