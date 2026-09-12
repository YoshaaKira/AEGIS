"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, BarChart3, Shield } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Route Planner", icon: Map },
  { href: "/visualizer", label: "Visualizer", icon: BarChart3 },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-brand">
          <Shield size={20} className="navbar-logo-icon" />
          <span className="navbar-wordmark">AEGIS</span>
          <span className="navbar-sub">Resilience Engine</span>
        </Link>

        <div className="navbar-links">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`navbar-link ${active ? "navbar-link-active" : ""}`}
              >
                <item.icon size={15} />
                {item.label}
                {active && <span className="navbar-link-indicator" />}
              </Link>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
        }
        .navbar-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          color: #0f172a;
        }
        .navbar-brand :global(.navbar-logo-icon) {
          color: #2563eb;
        }
        .navbar-wordmark {
          font-weight: 800;
          font-size: 1.05rem;
          letter-spacing: -0.02em;
          color: #0f172a;
        }
        .navbar-sub {
          font-size: 0.7rem;
          font-weight: 600;
          color: #64748b;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding-left: 8px;
          border-left: 1px solid #e2e8f0;
          margin-left: 4px;
        }
        .navbar-links {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .navbar-link {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #64748b;
          text-decoration: none;
          border-radius: 8px;
          transition: all 0.2s ease;
          position: relative;
        }
        .navbar-link:hover {
          color: #0f172a;
          background: #f1f5f9;
        }
        .navbar-link-active {
          color: #2563eb !important;
          background: rgba(37, 99, 235, 0.08);
        }
        .navbar-link-indicator {
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 2px;
          background: #2563eb;
          border-radius: 1px;
        }
        @media (max-width: 600px) {
          .navbar-sub { display: none; }
          .navbar-link span:not(.navbar-link-indicator) { display: none; }
        }
      `}</style>
    </nav>
  );
}
