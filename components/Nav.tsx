import Link from "next/link";

const LINKS = [
  { href: "/", label: "聯盟戰績" },
  { href: "/predict", label: "AI 賽事預測" },
  { href: "/my-team", label: "我的球隊" },
];

export default function Nav() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-black text-lg tracking-tight text-slate-900">
          ⚾ 愛棒球
          <span className="ml-1 font-medium text-slate-400 text-sm">CPBL 數據站</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-1.5 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
