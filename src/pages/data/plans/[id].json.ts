/** /data/plans/{id}.json — a plan's days, loaded by "Today's reading". */
import type { APIRoute, GetStaticPaths } from 'astro';
import { planData, plans } from '~/lib/plans-data';

export const getStaticPaths = (() =>
  plans.map((p) => ({ params: { id: p.id }, props: { plan: p } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify(planData(props.plan)), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
