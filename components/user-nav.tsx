"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "Find Lyrics" },
  { href: "/song-names", label: "Songs" },
  { href: "/artist-profiles", label: "Artists" },
  { href: "/request-song", label: "Request" },
  { href: "/about", label: "About" },
];

function normalizePath(path: string): string {
  if (path === "/") return path;
  return path.replace(/\/+$/, "");
}

function isLinkActive(pathname: string, href: string): boolean {
  const current = normalizePath(pathname);
  const target = normalizePath(href);

  if (target === "/") return current === "/";
  if (target === "/song-names") return current === "/song-names" || current === "/song";
  if (target === "/artist-profiles") return current === "/artist-profiles" || current === "/artist";
  return current === target || current.startsWith(`${target}/`);
}

export default function UserNav() {
  const pathname = usePathname();
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    function onScroll() {
      setIsHidden(window.scrollY > 100);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`card sticky top-4 z-20 w-full overflow-hidden rounded-2xl px-3 py-3 transition-all duration-300 ${
        isHidden ? "pointer-events-none -translate-y-5 opacity-0" : "translate-y-0 opacity-100"
      }`}
      aria-label="Primary navigation"
    >
      <ul className="flex w-full flex-wrap gap-2">
        {links.map((link) => {
          const isActive = isLinkActive(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`btn btn-mono text-center ${isActive ? "btn-primary" : "btn-secondary"}`}
                aria-current={isActive ? "page" : undefined}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
