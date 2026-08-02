/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { RecommendedAction } from '@kbn/pnd-common';

/**
 * The glyph on the card's header tile, standing in for the prototype's
 * per-proposal `approveIconType`: our gates carry a recommended action rather
 * than an icon, and the action is what the analyst is signing off on.
 */
const ICON_BY_ACTION: Readonly<Record<RecommendedAction, IconType>> = {
  contain: 'lock',
  escalate: 'flag',
  investigate: 'inspect',
  tune: 'wrench',
};

/** The header tile glyph for a gate's recommended action. */
export const getHitlActionIcon = (recommendedAction: RecommendedAction): IconType =>
  ICON_BY_ACTION[recommendedAction];
