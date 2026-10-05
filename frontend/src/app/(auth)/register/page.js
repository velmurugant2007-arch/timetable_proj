'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import TiltedCard from '@/components/TiltedCard';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [college, setCollege] = useState('PSNA CET');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { register } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password, college);
      router.push('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      {/* Left side: Background Image */}
      <div className="relative hidden w-0 flex-1 lg:block shadow-[20px_0_40px_rgba(0,0,0,0.1)] z-10">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/Loginpage.jpeg')" }}
        />
        <div className="absolute inset-0 bg-black/10" />
      </div>
      
      {/* Right side: Solid Color Column */}
      <div className="relative z-0 flex flex-1 flex-col items-center justify-center px-4 py-12 lg:flex-none lg:w-[480px] xl:w-[560px] bg-gradient-to-br from-[#c9bbb0] to-[#a3958a]">
        {/* Glassmorphism TiltedCard */}
        <div className="w-full max-w-md animate-[popIn_.3s_ease]">
          <TiltedCard 
            containerWidth="100%"
            containerHeight="auto"
            imageWidth="100%"
            imageHeight="auto"
            className="relative flex w-full flex-col justify-center rounded-2xl bg-white/85 backdrop-blur-3xl border border-white p-8 shadow-[0_16px_40px_rgba(0,0,0,0.1)]"
          >
            <div className="relative z-20 w-full flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-lg shadow-indigo-600/10 p-1">
            <img src="/images/psnalog.png" alt="PSNA Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="font-display text-xl font-bold text-slate-800 text-center">Create Account</h1>
          </div>
          
          <div className="relative z-20 mb-6 w-full mt-6">
            {error && (
              <div className="mb-4 rounded-lg border border-rose-200/50 bg-rose-50/50 backdrop-blur-sm px-4 py-2.5 text-sm text-rose-700">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Full Name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Dr. Admin"
              className="w-full rounded-xl border border-white/80 bg-white/80 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-500 outline-none transition focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@college.edu"
              className="w-full rounded-xl border border-white/80 bg-white/80 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-500 outline-none transition focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">College</span>
            <input type="text" value={college} onChange={(e) => setCollege(e.target.value)} placeholder="PSNA CET"
              className="w-full rounded-xl border border-white/80 bg-white/80 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-500 outline-none transition focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Password</span>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
                className="w-full rounded-xl border border-white/80 bg-white/80 px-3.5 py-2.5 pr-10 text-sm text-slate-800 placeholder-slate-500 outline-none transition focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="relative z-20 mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <a href="/login" className="font-semibold text-indigo-600 hover:text-indigo-800">Sign in</a>
        </p>
          </TiltedCard>
        </div>
      </div>
    </div>
  );
}
