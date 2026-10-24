module.exports = {
  content: ["./views/**/*.ejs"],
  safelist: [
    'bg-brand-50', 'bg-brand-100', 'bg-brand-500', 'bg-brand-600', 'bg-brand-700',
    'text-brand-600', 'border-brand-200', 'border-brand-500',
    'bg-slate-50', 'bg-slate-100', 'bg-slate-200', 'bg-slate-400', 'bg-slate-800', 'bg-slate-900',
    'text-slate-400', 'text-slate-500', 'text-slate-600', 'text-slate-800', 'text-white',
    'border-slate-200', 'border-slate-300',
    'scale-95', 'scale-100', 'opacity-0', 'opacity-100',
    'translate-y-0', 'translate-y-4', 'animate-pulse'
  ],
  theme: {
    extend: {
      fontFamily: { sans: ['Almarai', 'sans-serif'] },
      colors: { 
        brand: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 500: '#2563eb', 600: '#1d4ed8', 700: '#1d4ed8', 900: '#1e3a8a' }
      }
    }
  }
}
