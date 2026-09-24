/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import { listPacks } from '../packs';

/** Stable UUID namespace for pack hunt rule_ids (look like real detection rule UUIDs). */
export const HUNT_RULE_ID_NAMESPACE = '7e2f9c1a-4b8d-4e6f-9a3c-1d5e8b0f2a74';

export const huntRuleId = (packId: string, huntName: string): string => {
  return uuidv5(`${packId}:${huntName}`, HUNT_RULE_ID_NAMESPACE);
};

/** Legacy rule_id format from older generator runs (for --clean / migration). */
export const legacyHuntRuleId = (packId: string, huntName: string): string => {
  const safe = huntName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `data-generator-pack-${packId}-${safe}`;
};

export const allKnownPackHuntRuleIds = (): string[] => {
  const ids: string[] = [];
  for (const pack of listPacks()) {
    for (const hunt of pack.hunts) {
      ids.push(huntRuleId(pack.id, hunt.name));
      ids.push(legacyHuntRuleId(pack.id, hunt.name));
    }
  }
  return ids;
};
