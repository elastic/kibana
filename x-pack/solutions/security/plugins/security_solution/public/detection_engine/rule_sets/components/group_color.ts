/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';

const PALETTE = euiPaletteColorBlind();

/** A stable color for a group, so the same group has the same folder color everywhere. */
export const groupColor = (groupId: string): string => {
  let hash = 0;
  for (let i = 0; i < groupId.length; i++) {
    hash = (hash * 31 + groupId.charCodeAt(i)) % 1_000_003;
  }
  return PALETTE[hash % PALETTE.length];
};
