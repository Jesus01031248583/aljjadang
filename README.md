# 알짜당 — 애드센스 승인용 생활 정보 사이트

마크다운으로 글을 쓰면 정적 HTML 사이트로 만들어 주는 간단한 구조입니다.

## 폴더 구조

```
content/posts/   블로그 글 (.md)
content/pages/   소개·문의·개인정보처리방침·면책 고지
src/             빌드 스크립트, CSS, 파비콘
site.config.json 사이트 이름, 주소, 이메일, 애드센스 ID
dist/            빌드 결과물 (배포 대상, 자동 생성)
```

## 사용법

```bash
npm install      # 처음 한 번
npm run build    # dist/ 생성
npm run preview  # 빌드 후 http://localhost:3000 에서 미리보기
```

## 새 글 쓰기

`content/posts/영문-주소.md` 파일을 만들고 맨 위에 아래 내용을 넣습니다. 파일 이름이 글 주소가 됩니다. 안내 문구가 들어 있는 `templates/new-post.md`를 복사해서 시작해도 됩니다.

```markdown
---
title: 글 제목
description: 검색 결과에 보일 1~2문장 요약
category: 절약
date: 2026-10-20
---

본문...
```

- 카테고리 예시: `절약`, `청소·관리`, `정리·수납`, `생활 준비`
- 쓰는 중인 글은 `draft: true`를 넣으면 빌드에서 빠집니다.
- 글을 고쳤다면 `updated: 2026-11-01`처럼 수정일을 넣을 수 있습니다.

## 배포 (Cloudflare Pages 기준, 무료)

1. GitHub에 이 폴더를 저장소로 올립니다.
2. Cloudflare 대시보드 → Workers & Pages → Pages → 저장소 연결
3. 빌드 설정: Build command `npm run build`, Output directory `dist`
4. 도메인을 산 뒤 Custom domains에서 연결합니다.
5. `site.config.json`의 `url`을 실제 도메인으로 바꾸고 다시 배포합니다.

Netlify, Vercel에서도 같은 빌드 설정으로 동작합니다.

## 애드센스 신청 순서

1. **글을 15~20개 이상으로 늘립니다.** 직접 경험이나 사진을 넣은 글일수록 좋습니다.
2. `site.config.json`의 `email`, `author`를 실제 정보로 바꿉니다.
3. Google Search Console에 사이트를 등록하고 `https://도메인/sitemap.xml`을 제출합니다.
4. 애드센스에 가입하고 사이트를 추가하면 `ca-pub-XXXXXXXXXXXXXXXX` 형태의 게시자 ID가 나옵니다.
5. `site.config.json`의 `adsenseClient`에 그 값을 넣고 다시 배포합니다.
   - 모든 페이지 `<head>`에 애드센스 코드가 들어갑니다.
   - `ads.txt`가 자동으로 생성됩니다.
6. 애드센스 화면에서 "검토 요청"을 누르고 결과를 기다립니다 (보통 며칠~몇 주).
