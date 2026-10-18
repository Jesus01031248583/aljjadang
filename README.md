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

## 계산기

계산기 하나는 파일 세 개로 이루어집니다. 이름(예: `salary`)이 주소 `/calculators/salary/`가 됩니다.

- `content/calculators/이름.md`: 제목·설명과 계산기 아래에 붙는 본문. `order`로 순서, `related`로 함께 볼 글(쉼표로 구분)을 정합니다.
- `src/calc/이름.html`: 입력 폼
- `src/calc/이름.js`: 계산 코드

글 본문에 `{{calc:이름}}` 한 줄을 넣으면 그 계산기로 가는 카드가 들어갑니다.

### 기준값 안전장치

- **자동 감시** (`.github/workflows/rates-watch.yml`, 매일 11:17): 한국은행 기준금리, 관련 법령 시행일(`src/watch-sources.json`), 유효기간, 정기 점검일을 확인하고 달라진 점이 있으면 '계산기 점검' 라벨 이슈를 만듭니다. 값은 자동으로 바꾸지 않습니다. 로컬에서는 `node src/watch.mjs`로 결과만 볼 수 있습니다.
- **화면 안내**: `rates.js`의 `VALID_UNTIL` 날짜가 지나거나 올해 최저임금이 없으면 해당 계산기에 "새 기준 확인 중" 안내가 자동으로 뜹니다.
- **빌드 경고**: 정기 점검일이나 유효기간이 지나면 빌드할 때 경고가 나옵니다.

요율과 기준 금액은 `src/calc/rates.js` 한 곳에 모여 있습니다. 매년 1월(최저임금·4대보험 요율)과 7월(국민연금 상·하한)에 확인해 고칩니다. 근로소득 간이세액표가 개정되면 `src/calc/wage-tax-table.js`를 새 표로 바꿉니다.

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

## 썸네일과 설명 그림

- 글마다 대표 이미지(`/thumbs/글주소.png`, 1200×630)가 빌드할 때 자동으로 만들어집니다. 제목·카테고리·아이콘으로 그리며, 카카오톡·검색 공유 미리보기에 쓰입니다.
- 아이콘은 머리말에 `icon: car`처럼 지정합니다. 쓸 수 있는 이름은 `src/build.mjs`의 `ICONS`에 있고, 없으면 카테고리 아이콘을 씁니다.
- 본문 그림은 `content/figures/이름.svg`로 그린 뒤 본문에 `![그림 내용 설명](/figures/이름.png "그림 아래 설명")`으로 넣습니다. 빌드할 때 2배 해상도 PNG로 바뀝니다.
- 글꼴은 `src/fonts`의 Pretendard(SIL OFL)를 씁니다.
