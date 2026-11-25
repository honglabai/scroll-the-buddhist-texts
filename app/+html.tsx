import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta
          name="description"
          content="마음스크롤 · Dharma Scroll — 스크롤할수록 마음이 맑아지는 시간. 광고와 로그인 없이 한 구절씩 읽고 사유하는 불교 경전 읽기 앱."
        />
        <title>마음스크롤 · Dharma Scroll</title>
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
