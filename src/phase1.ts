import {
  computeDelta,
  getCurrentMap,
  getTargetMap,
  submit,
} from "./lib/api.ts";

const CANDIDATE_ID = Deno.env.get("CANDIDATE_ID");

if (CANDIDATE_ID == null) {
  console.error("CANDIDATE_ID env variable not set!");
  Deno.exit(1);
}

const current = await getCurrentMap(CANDIDATE_ID);
const target = await getTargetMap(CANDIDATE_ID);

if (current instanceof Error) {
  console.error("Errors found while fetching current map:");
  console.error(current);
  Deno.exit(2);
}

if (target instanceof Error) {
  console.error("Errors found while fetching target map:");
  console.error(target);
  Deno.exit(2);
}

const delta = computeDelta(current, target);

if (delta instanceof Error) {
  console.error("Errors found while computing deltas:");
  console.error(delta);
  Deno.exit(3);
}

const result = await submit(CANDIDATE_ID, delta);
if (result instanceof Error) {
  console.log("Errors found while submitting solution:");
  console.log(result);
  Deno.exit(4);
}

// No news, good news
