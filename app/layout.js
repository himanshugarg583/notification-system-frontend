import "./globals.css";

export const metadata = {
  title: "NotifyDesk — notification console",
  description: "Triggers, channels, and templates from one screen.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
