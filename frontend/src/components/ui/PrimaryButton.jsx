/** PrimaryButton — prototype line 175 */
export default function PrimaryButton({ children, onClick, icon: Icon, className = '', disabled, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}
