import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '채린룰 체스',
  description: '직업과 능력을 얹은 체스 — 채린룰의 밴·픽과 능력 규칙을 그대로 체스 위로 옮겼습니다.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
