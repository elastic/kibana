/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostItem } from '../../../../../common/search_strategy/security_solution/hosts';
import type { InfluencerInput } from '../types';

export const hostToInfluencers = (hostItem: HostItem): InfluencerInput[] | null => {
  if (hostItem.host != null && hostItem.host.name != null) {
    const influencers: InfluencerInput[] = [
      {
        fieldName: 'host.name',
        fieldValue: hostItem.host.name[0],
      },
    ];
    return influencers;
  } else {
    return null;
  }
};
