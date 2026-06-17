import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import { AuthContextProvider } from "@/contexts/AuthContext";

export const metadata = {
  title: "도담 — 가족·육아 복지 도우미",
  description:
    "가족 상황만 입력하면 받을 수 있는 육아·출산 복지를 AI가 찾아주는 서비스, 도담.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthContextProvider>{children}</AuthContextProvider>
      </body>
    </html>
  );
}
