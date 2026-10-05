/** IconButton — prototype line 202 */
export default function IconButton({ onClick, icon: Icon, tone = 'slate', title }) {
  const tones = {
    slate: 'text-slate-500 hover:bg-slate-100',
    rose: 'text-rose-500 hover:bg-rose-50',
    indigo: 'text-indigo-600 hover:bg-indigo-50',
  };
  return (
    <button title={title} onClick={onClick} className={`rounded-lg p-2 transition ${tones[tone]}`}>
      <Icon size={16} />
    </button>
  );
}
