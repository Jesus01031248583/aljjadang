// 예약 발행: 글 frontmatter의 `publishAt: 2026-10-17 12:30`(한국 시각)이 지나야 공개한다.
export const KST_OFFSET = "+09:00";

export function publishTime(post) {
  if (!post.publishAt) return null;
  const t = new Date(post.publishAt.trim().replace(" ", "T") + KST_OFFSET);
  if (Number.isNaN(t.getTime())) throw new Error(`publishAt 형식 오류 (${post.slug}): "${post.publishAt}" — 예: 2026-10-17 12:30`);
  return t;
}

// 지금 공개해도 되는 글인가 (draft가 아니고, 예약 시각이 없거나 지났다)
export function isPublic(post, now = new Date()) {
  if (post.draft === "true") return false;
  const t = publishTime(post);
  return !t || t <= now;
}
