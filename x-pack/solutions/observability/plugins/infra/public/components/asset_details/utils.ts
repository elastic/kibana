/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfraMetadata } from '../../../common/http_api';
import { INTEGRATIONS } from './constants';

export const toTimestampRange = ({ from, to }: { from: string; to: string }) => {
  const fromTs = new Date(from).getTime();
  const toTs = new Date(to).getTime();

  return { from: fromTs, to: toTs };
};

export const getDefaultDateRange = () => ({
  from: 'now-15m',
  to: 'now',
});

export const getIntegrationsAvailable = (metadata?: InfraMetadata | null) => {
  if (!metadata) {
    return [];
  }

  return Object.entries(INTEGRATIONS)
    .filter(([_, fields]) => metadata?.features?.some((f) => fields.includes(f.name)))
    .map(([name]) => name);
};
