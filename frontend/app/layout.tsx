import type { Metadata } from "next";
import { Navbar } from "../components/Navbar";
import "./styles.css";

export const metadata: Metadata = {
  title: "AEGIS — Resilience-Aware Logistics Planning",
  description:
    "Stress-test delivery plans against disruption and visualize the cost-versus-resilience tradeoff in real time.",
};

export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
