/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreatTechnique } from '@kbn/securitysolution-io-ts-alerting-types';
import type { MitreSubtechniqueSummary } from '@kbn/security-mitre-attack-common';

/**
 * Returns true if the given mitre technique has any subtechniques in the provided dataset.
 */
export const hasSubtechniqueOptions = (
  technique: ThreatTechnique,
  subtechniques: MitreSubtechniqueSummary[]
): boolean => subtechniques.some((subtechnique) => subtechnique.technique_id === technique.id);
