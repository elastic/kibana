/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StatState } from './use_soc_trends';

type StatActions =
  | {
      type: 'setUpdatedAt';
      updatedAt: StatState['updatedAt'];
    }
  | {
      type: 'setIsLoading';
      isLoading: StatState['isLoading'];
    }
  | {
      type: 'setStat';
      stat: StatState['stat'];
    }
  | {
      type: 'setPercentage';
      percentage: StatState['percentage'];
    };

export const statReducer = (state: StatState, action: StatActions) => {
  switch (action.type) {
    case 'setIsLoading':
      return { ...state, isLoading: action.isLoading };
    case 'setUpdatedAt':
      return { ...state, updatedAt: action.updatedAt };
    case 'setStat':
      return { ...state, stat: action.stat };
    case 'setPercentage':
      return { ...state, percentage: action.percentage };
    default:
      throw new Error();
  }
};
