/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkEditOperation } from '@kbn/alerting-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';

import type { BulkActionEditForRuleAttributes } from '../../../../../../common/api/detection_engine/rule_management';
import { BulkActionEditTypeEnum } from '../../../../../../common/api/detection_engine/rule_management';
import { assertUnreachable } from '../../../../../../common/utility_types';
import { parseAndTransformRuleActions } from './utils';

/**
 * converts bulk edit action to format of rulesClient.bulkEdit operation
 * @param action BulkActionEditForRuleAttributes
 * @returns rulesClient BulkEditOperation
 */
export const bulkEditActionToRulesClientOperation = (
  actionsClient: ActionsClient,
  action: BulkActionEditForRuleAttributes
): BulkEditOperation[] => {
  switch (action.type) {
    // tags actions
    case BulkActionEditTypeEnum.add_tags:
      return [
        {
          field: 'tags',
          operation: 'add',
          value: action.value,
        },
      ];

    case BulkActionEditTypeEnum.delete_tags:
      return [
        {
          field: 'tags',
          operation: 'delete',
          value: action.value,
        },
      ];

    case BulkActionEditTypeEnum.set_tags:
      return [
        {
          field: 'tags',
          operation: 'set',
          value: action.value,
        },
      ];

    // rule actions
    case BulkActionEditTypeEnum.add_rule_actions:
      return [
        {
          field: 'actions',
          operation: 'add',
          value: parseAndTransformRuleActions(
            actionsClient,
            action.value.actions,
            action.value.throttle
          ),
        },
      ];

    case BulkActionEditTypeEnum.set_rule_actions:
      return [
        {
          field: 'actions',
          operation: 'set',
          value: parseAndTransformRuleActions(
            actionsClient,
            action.value.actions,
            action.value.throttle
          ),
        },
      ];

    // schedule actions
    case BulkActionEditTypeEnum.set_schedule:
      return [
        {
          field: 'schedule',
          operation: 'set',
          value: {
            interval: action.value.interval,
          },
        },
      ];

    default:
      return assertUnreachable(action);
  }
};
