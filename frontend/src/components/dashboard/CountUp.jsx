'use client';
import { useCountUp } from '@/hooks/useCountUp';

/** CountUp — prototype lines 339-342 */
export default function CountUp({ value, className }) {
  const n = useCountUp(value);
  return <span className={className}>{n}</span>;
}
