/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostItem } from '../../../../../common/search_strategy/security_solution/hosts';
import type { CriteriaFields } from '../types';

export const hostToCriteria = (hostItem: HostItem): CriteriaFields[] => {
  if (hostItem == null) {
    return [];
  }
  if (hostItem.host != null && hostItem.host.name != null) {
    const criteria: CriteriaFields[] = [
      {
        fieldName: 'host.name',
        fieldValue: hostItem.host.name[0],
      },
    ];
    return criteria;
  } else {
    return [];
  }
};
