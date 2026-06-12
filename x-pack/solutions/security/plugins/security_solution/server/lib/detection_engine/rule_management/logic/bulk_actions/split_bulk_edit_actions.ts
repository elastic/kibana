/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulkActionEditTypeEnum } from '../../../../../../common/api/detection_engine/rule_management';
import type {
  BulkActionEditPayload,
  BulkActionEditForRuleAttributes,
  BulkActionEditForRuleParams,
} from '../../../../../../common/api/detection_engine/rule_management';

/**
 * Split bulk edit actions in 2 chunks: actions applied to params and
 * actions applied to attributes
 * @param actions BulkActionEditPayload[]
 * @returns lists of split actions
 */
export const splitBulkEditActions = (actions: BulkActionEditPayload[]) => {
  const splitActions: {
    attributesActions: BulkActionEditForRuleAttributes[];
    paramsActions: BulkActionEditForRuleParams[];
  } = {
    attributesActions: [],
    paramsActions: [],
  };

  return actions.reduce((acc, action) => {
    switch (action.type) {
      case BulkActionEditTypeEnum.set_schedule:
        acc.attributesActions.push(action);
        acc.paramsActions.push(action);
        break;
      case BulkActionEditTypeEnum.add_tags:
      case BulkActionEditTypeEnum.set_tags:
      case BulkActionEditTypeEnum.delete_tags:
      case BulkActionEditTypeEnum.add_rule_actions:
      case BulkActionEditTypeEnum.set_rule_actions:
        acc.attributesActions.push(action);
        break;
      default:
        acc.paramsActions.push(action);
    }

    return acc;
  }, splitActions);
};
