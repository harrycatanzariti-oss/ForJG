/**
 * /og/{slug}.png: social preview images, generated once at build time.
 * One per section, book, tradition, Guide topic, Big Question and plan.
 * Chapter pages reuse their book's image.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { SITE_TAGLINE } from '~/config';
import { books, getIntro } from '~/lib/bible';
import { bigQuestions, traditions } from '~/lib/content';
import { guideTopics } from '~/lib/guide-data';
import { renderOg } from '~/lib/og';
import { plans } from '~/lib/plans-data';

const clip = (s: string, n = 110) =>
  s.length > n
    ? `${s
        .slice(0, n - 1)
        .replace(/\s+\S*$/, '')
        .replace(/[.,;:]$/, '')}…`
    : s;

export const getStaticPaths = (() => [
  { params: { slug: 'default' }, props: { title: 'Read the Bible, one clear step at a time', subtitle: SITE_TAGLINE } },
  {
    params: { slug: 'bible' },
    props: { title: 'The Bible', subtitle: '66 books at the reading level that suits you' },
  },
  {
    params: { slug: 'guide' },
    props: { title: 'Where are you today?', subtitle: 'Find passages and next steps for where you are' },
  },
  {
    params: { slug: 'plans' },
    props: { title: 'Reading plans', subtitle: 'From 21 days to the whole Bible in a year' },
  },
  {
    params: { slug: 'traditions' },
    props: { title: 'Christian traditions', subtitle: 'Explained fairly, in their own words, with sources' },
  },
  ...books.map((b) => ({
    params: { slug: `bible/${b.id}` },
    props: { title: b.name, subtitle: clip(getIntro(b.id)?.overview ?? '') },
  })),
  ...traditions.map((t) => ({
    params: { slug: `traditions/${t.id}` },
    props: { title: t.name, subtitle: clip(t.originSummary) },
  })),
  ...bigQuestions.map((q) => ({
    params: { slug: `questions/${q.id}` },
    props: { title: q.title, subtitle: clip(q.intro) },
  })),
  ...guideTopics.map((t) => ({ params: { slug: `guide/${t.id}` }, props: { title: t.title, subtitle: clip(t.step) } })),
  ...plans.map((p) => ({ params: { slug: `plans/${p.id}` }, props: { title: p.name, subtitle: p.short } })),
]) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) =>
  new Response(new Uint8Array(await renderOg(props.title, props.subtitle)), {
    headers: { 'Content-Type': 'image/png' },
  });
