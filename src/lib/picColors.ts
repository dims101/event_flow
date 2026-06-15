const getHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

export const getRoleBadgeStyle = (role: string) => {
  const normalized = role.trim().toLowerCase();
  
  if (normalized === 'all') {
    return 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400';
  }
  if (normalized === 'mc') {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-400';
  }
  if (normalized === 'catering') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400';
  }
  if (normalized === 'mua') {
    return 'border-purple-500/20 bg-purple-500/10 text-purple-400';
  }
  if (normalized === 'fotografer' || normalized === 'dokumentasi') {
    return 'border-blue-500/20 bg-blue-500/10 text-blue-400';
  }
  if (normalized.includes('kua')) {
    // Brown color style (coklat) using arbitrary HEX values
    return 'border-[#8B4513]/30 bg-[#8B4513]/10 text-[#CD853F] dark:text-[#D2B48C]';
  }
  if (normalized.includes('pria')) {
    // Blue style
    return 'border-blue-500/20 bg-blue-500/10 text-blue-400';
  }
  if (normalized.includes('wanita')) {
    // Pink style
    return 'border-pink-500/20 bg-pink-500/10 text-pink-400';
  }
  if (normalized.includes('keluarga')) {
    // Teal style
    return 'border-teal-500/20 bg-teal-500/10 text-teal-400';
  }

  // Predefined distinctive Tailwind classes for custom PICs
  const colors = [
    'border-cyan-500/20 bg-cyan-500/10 text-cyan-400',
    'border-rose-500/20 bg-rose-500/10 text-rose-400',
    'border-orange-500/20 bg-orange-500/10 text-orange-400',
    'border-lime-500/20 bg-lime-500/10 text-lime-400',
    'border-sky-500/20 bg-sky-500/10 text-sky-400',
    'border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-400',
    'border-violet-500/20 bg-violet-500/10 text-violet-400',
  ];
  
  const hash = getHash(normalized);
  return colors[hash % colors.length];
};
