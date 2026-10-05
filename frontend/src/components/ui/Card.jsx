/** Card — prototype line 167 */
export default function Card({ children, className = '', style }) {
  return (
    <div style={style} className={`rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60 ${className}`}>
      {children}
    </div>
  );
}
