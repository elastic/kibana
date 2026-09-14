/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreFramework } from './schema';

/** Builds the deterministic saved-object ID for a MITRE entity. */
export const buildSoId = ({
  framework,
  frameworkVersion,
  id,
}: {
  framework: MitreFramework;
  frameworkVersion: string;
  id: string;
}): string => `${framework}:${frameworkVersion}:${id}`;
