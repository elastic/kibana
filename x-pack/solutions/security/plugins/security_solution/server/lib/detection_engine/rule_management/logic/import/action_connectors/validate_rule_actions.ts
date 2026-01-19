/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';
import { isBoom } from '@hapi/boom';
import type { RuleToImport } from '../../../../../../../common/api/detection_engine';
import { createBulkErrorObject, type BulkError } from '../../../../routes/utils';

export type ActionsOrErrors =
  | { allActions: ConnectorWithExtraFindData[]; bulkError: undefined }
  | { allActions: undefined; bulkError: BulkError };

export interface ValidatedRulesAndErrors {
  validatedActionRules: RuleToImport[];
  missingActionErrors: BulkError[];
}

const getActionsOrError = async ({
  actionsClient,
}: {
  actionsClient: ActionsClient;
}): Promise<ActionsOrErrors> => {
  try {
    return {
      allActions: await actionsClient.getAll({ includeSystemActions: true }),
      bulkError: undefined,
    };
  } catch (exc) {
    if (isBoom(exc) && exc.output.statusCode === 403) {
      return {
        allActions: undefined,
        bulkError: createBulkErrorObject({
          statusCode: 403,
          message: `You may not have actions privileges required to import rules with actions: ${exc.output.payload.message}`,
        }),
      };
    } else {
      throw exc;
    }
  }
};

export const validateRuleActions = async ({
  actionsClient,
  rules,
}: {
  actionsClient: ActionsClient;
  rules: RuleToImport[];
}): Promise<ValidatedRulesAndErrors> => {
  const [rulesWithActions, rulesWithoutActions] = partition(
    rules,
    (rule) => rule.actions != null && rule.actions.length > 0
  );
  if (rulesWithActions.length === 0) {
    return { validatedActionRules: rulesWithoutActions, missingActionErrors: [] };
  }

  const missingActionErrors: BulkError[] = [];
  const actionsOrError = await getActionsOrError({ actionsClient });
  if (actionsOrError.bulkError != null) {
    return {
      validatedActionRules: rulesWithoutActions,
      missingActionErrors: rulesWithActions.map((rule) => ({
        id: rule.id,
        rule_id: rule.rule_id,
        error: actionsOrError.bulkError.error,
      })),
    };
  }
  const allActionIdsSet = new Set(actionsOrError.allActions.map((action) => action.id));

  const validatedRulesWithActions = rulesWithActions.filter((rule) => {
    // We know rulesWithActions have actions, but TypeScript does not
    if (rule.actions == null || rule.actions.length === 0) {
      return true;
    }

    const missingActions = rule.actions.filter((action) => !allActionIdsSet.has(action.id));

    if (missingActions.length > 0) {
      missingActionErrors.push({
        id: rule.id,
        rule_id: rule.rule_id,
        error: {
          status_code: 404,
          message: `Rule actions reference the following missing action IDs: ${missingActions
            .map((action) => action.id)
            .join(',')}`,
        },
      });
      return false;
    }
    return true;
  });

  return {
    validatedActionRules: rulesWithoutActions.concat(validatedRulesWithActions),
    missingActionErrors,
  };
};
