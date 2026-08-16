/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverValid from 'semver/functions/valid';
import semverGte from 'semver/functions/gte';

/** First Elastic Agent version that honors Maintenance Window scheduling. */
export const MIN_MW_SUPPORTED_AGENT_VERSION = '8.19.0';

/**
 * Whether an Elastic Agent version is new enough to honor Maintenance Windows.
 * An unparsable or missing version is treated as compatible so we never warn
 * on data we can't verify.
 */
export const isAgentVersionMwCompatible = (agentVersion?: string | null): boolean => {
  const valid = agentVersion ? semverValid(agentVersion) : null;
  if (!valid) {
    return true;
  }
  return semverGte(valid, MIN_MW_SUPPORTED_AGENT_VERSION);
};
