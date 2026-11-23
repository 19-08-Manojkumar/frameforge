import type { Metadata } from "next";
import "./globals.css";
import "./fonts.css";
import "./workspace.css";
import "./photo-editor.css";
import "./session.css";
import "./decorations.css";
import "./quick-create.css";
import "./drafts.css";
import "./text-editing.css";
import "./adaptive-preview.css";
import "./studio-polish.css";
import "./sticker-styles.css";
import "./ai-studio.css";

export const metadata: Metadata = {
  title: "FrameForge — Little moments. Beautifully together.",
  description:
    "Turn your favorite photos into a beautiful collage. Thirty-one editable themes, precise sizes, and high-resolution downloads. All in your browser.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
