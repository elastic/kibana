/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { RoundedBadge } from './rounded_badge';
import { RoundedBadgeAntenna } from './rounded_badge_antenna';

export type AndOr = 'and' | 'or';
export interface AndOrBadgeProps {
  type: AndOr;
  includeAntennas?: boolean;
}
/** Displays AND / OR in a round badge */
// This ticket is closed, however, as of 3/23/21 no round badge yet
// Ref: https://github.com/elastic/eui/issues/1655
export const AndOrBadge = React.memo<AndOrBadgeProps>(({ type, includeAntennas = false }) => {
  return includeAntennas ? <RoundedBadgeAntenna type={type} /> : <RoundedBadge type={type} />;
});

AndOrBadge.displayName = 'AndOrBadge';
