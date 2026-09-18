/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AD2_SCENARIO_ID_PREFIX } from './constants';

/**
 * Seeded identifiers are opaque: a digest of the fixture coordinates that
 * produced the document, never the scenario key.
 *
 * The key IS the target/noise discriminator — every background key starts with
 * `bg-` — and the dense ES|QL result returns `_id`, so an identifier that spells
 * the key out lets a model drop every background row, then recover the four real
 * chains by grouping the remainder on the shared `<key>-alert-` prefix, without
 * reading a single content field. That defeats the retrieval/correlation
 * measurement the dense profile exists to make.
 *
 * Two polynomial hashes from different bases give a 64-bit, platform-stable
 * digest, so ids stay reproducible across machines and runs without pulling a
 * crypto implementation into the fixture.
 */

/** 2^31 - 1, a Mersenne prime. */
const MODULUS = 2147483647;

const polynomialHash = (value: string, base: number): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    // Bounded arithmetic: the largest intermediate is `hash * 131 + charCode`,
    // below 2^38, well inside the exact-integer range of a float64 — so this
    // needs no bitwise operators (which this repo's lint rules disallow).
    hash = (hash * base + value.charCodeAt(index)) % MODULUS;
  }
  return hash;
};

export const ad2SeedDigest = (...parts: ReadonlyArray<string | number>): string => {
  const value = parts.join('\u0000');
  const first = polynomialHash(value, 31);
  const second = polynomialHash(value, 131);
  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`;
};

/**
 * `${prefix}${kind}-${digest}`.
 *
 * `kind` names the document type (alert, process, rule, ...). That is not a
 * target/noise discriminator, and it is part of the digested input as well, so
 * two kinds can never collide on one digest.
 */
export const ad2SeedId = (kind: string, ...parts: ReadonlyArray<string | number>): string =>
  `${AD2_SCENARIO_ID_PREFIX}${kind}-${ad2SeedDigest(kind, ...parts)}`;

/**
 * The one id that has to agree with the reference `alertIds` the datasets hand
 * the Rubric evaluator, so it lives in a named function rather than being
 * rebuilt at each call site.
 */
export const ad2ScenarioAlertId = (scenarioKey: string, stepNumber: number): string =>
  ad2SeedId('alert', scenarioKey, stepNumber);
