/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaFields } from '../types';
import { NetworkType } from '../../../../explore/network/store/model';
import { FlowTarget } from '../../../../../common/search_strategy';

export const getCriteriaFromNetworkType = (
  type: NetworkType,
  ip: string | undefined,
  flowTarget?: FlowTarget
): CriteriaFields[] => {
  if (type === NetworkType.details && ip != null) {
    if (flowTarget === FlowTarget.source) {
      return [{ fieldName: 'source.ip', fieldValue: ip }];
    } else if (flowTarget === FlowTarget.destination) {
      return [{ fieldName: 'destination.ip', fieldValue: ip }];
    } else {
      return [];
    }
  } else {
    return [];
  }
};
