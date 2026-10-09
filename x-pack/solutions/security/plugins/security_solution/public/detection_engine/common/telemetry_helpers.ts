/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreatArray } from '../../../common/api/detection_engine/model/rule_schema';

export const extractThreatTechniqueIds = (threat?: ThreatArray): string[] => {
  if (!threat) {
    return [];
  }
  return threat.flatMap((entry) => entry.technique?.map((technique) => technique.id) ?? []);
};
