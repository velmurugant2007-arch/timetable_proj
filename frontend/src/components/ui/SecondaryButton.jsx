/** SecondaryButton — prototype line 189 */
export default function SecondaryButton({ children, onClick, icon: Icon, className = '', disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}
