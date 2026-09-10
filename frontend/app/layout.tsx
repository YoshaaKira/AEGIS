import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = { title: "AEGIS", description: "Resilience-aware logistics planning" };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
