import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';

export const metadata = {
  title: 'PSNA CET CSE DEPARTMENT TIME TABLE GENERATOR',
  description: 'Automatically generate conflict-free timetables for all years and sections of a college.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-800 antialiased">
        <AuthProvider>
          <AppProvider>
            {children}
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
