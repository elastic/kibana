/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CreateWatchlistRequestBodyInput } from '../../../../common/api/entity_analytics/watchlists/management/create.gen';

export interface ManagedWatchlistSourceInputProps {
  watchlist: CreateWatchlistRequestBodyInput;
}

export const ManagedWatchlistSourceInput = ({ watchlist }: ManagedWatchlistSourceInputProps) => {
  // We can switch on something like watchlist.name or watchlist.description
  // or a specific field to render different sources based on the managed source type
  return (
    <div>
      {'ManagedWatchlistSourceInput for '}
      {watchlist.name}
    </div>
  );
};
