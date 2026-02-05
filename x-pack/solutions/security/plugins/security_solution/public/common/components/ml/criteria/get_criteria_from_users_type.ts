/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsersType } from '../../../../explore/users/store/model';
import type { CriteriaFields } from '../types';
import type { EntityIdentifiers } from '../../../containers/anomalies/anomalies_query_tab_body/types';

export const getCriteriaFromUsersType = (
  type: UsersType,
  entityIdentifiers?: EntityIdentifiers
): CriteriaFields[] => {
  if (type === UsersType.details && entityIdentifiers != null) {
    const userName = entityIdentifiers['user.name'];
    if (userName != null) {
      return [{ fieldName: 'user.name', fieldValue: userName }];
    }
  }
  return [];
};
