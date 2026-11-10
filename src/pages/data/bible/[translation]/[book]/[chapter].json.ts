/**
 * Generates one static JSON file per chapter per translation, e.g.
 * /data/bible/bsb/john/3.json. The reader fetches these on demand, so a
 * visitor only ever downloads the chapters they actually open.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { allChapterFiles } from '~/lib/bible';

export const getStaticPaths = (() =>
  allChapterFiles().map(({ translation, book, chapter, data }) => ({
    params: { translation, book, chapter },
    props: { data },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify(props.data), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
