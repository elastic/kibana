/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SECURITY_PATTERNS } from '@kbn/data-source-catalog';

export function getSecurityPatterns(configOverride?: string[]): string[] {
  return configOverride ?? DEFAULT_SECURITY_PATTERNS;
}
