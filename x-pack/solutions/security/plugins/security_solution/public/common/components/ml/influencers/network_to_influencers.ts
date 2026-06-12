/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfluencerInput } from '../types';

export const networkToInfluencers = (ip: string): InfluencerInput[] => {
  const influencers: InfluencerInput[] = [
    {
      fieldName: 'source.ip',
      fieldValue: ip,
    },
    {
      fieldName: 'destination.ip',
      fieldValue: ip,
    },
  ];
  return influencers;
};
