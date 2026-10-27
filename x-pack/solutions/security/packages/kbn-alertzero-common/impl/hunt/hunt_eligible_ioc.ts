/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Which stored report IOCs a hunt may search.
 *
 * Mirrors the promote task's promotable tiers and `deferred_unreviewed` skip
 * (`security_solution` `promote_threat_indicators`): `discriminating`,
 * `contextual`, and `uncertain` are eligible; `reference` and `denied` are not.
 * A missing tier (`undefined` / `null` / `''`) means the IOC was never
 * adjudicated (seeded and legacy report docs) and stays hunt-eligible. That
 * deliberately differs from promote, which requires a known promotable tier.
 * Anything with `deferred_unreviewed: true` is excluded until a later enrich
 * reviews it.
 */
export const HUNT_ELIGIBLE_IOC_TIERS = ['discriminating', 'contextual', 'uncertain'] as const;

export type HuntEligibleIocTier = (typeof HUNT_ELIGIBLE_IOC_TIERS)[number];

export const isHuntEligibleIoc = (ioc: {
  tier?: unknown;
  deferred_unreviewed?: unknown;
}): boolean => {
  if (ioc.deferred_unreviewed === true) {
    return false;
  }
  if (ioc.tier === undefined || ioc.tier === null || ioc.tier === '') {
    return true;
  }
  return (
    typeof ioc.tier === 'string' &&
    (HUNT_ELIGIBLE_IOC_TIERS as readonly string[]).includes(ioc.tier)
  );
};
