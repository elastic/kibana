/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverCoerce from 'semver/functions/coerce';
import semverGte from 'semver/functions/gte';

/** First Elastic Agent version that honors Maintenance Window scheduling. */
export const MIN_MW_SUPPORTED_AGENT_VERSION = '8.19.0';

/** Response of `GET …/private_locations/outdated_mw_agents`. */
export interface OutdatedMwAgentLocationsResponse {
  outdatedLocationIds: string[];
}

/**
 * Whether an Elastic Agent version is new enough to honor Maintenance Windows.
 * An unparsable or missing version is treated as compatible so we never warn
 * on data we can't verify. Coerces away prerelease/build tags (e.g.
 * `8.19.0-SNAPSHOT`, reported by dev/canary agents) before comparing, since
 * semver ranks a prerelease below its release and would otherwise flag an
 * already-compatible agent as outdated.
 */
export const isAgentVersionMwCompatible = (agentVersion?: string | null): boolean => {
  const coerced = agentVersion ? semverCoerce(agentVersion) : null;
  if (!coerced) {
    return true;
  }
  return semverGte(coerced.version, MIN_MW_SUPPORTED_AGENT_VERSION);
};
