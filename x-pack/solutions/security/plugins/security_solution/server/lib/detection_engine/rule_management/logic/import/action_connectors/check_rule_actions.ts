/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsClient } from '@kbn/actions-plugin/server';
import { RuleToImport } from '../../../../../../../common/api/detection_engine';
import { BulkError } from '../../../../routes/utils';
import { handleActionConnectorsErrors } from './utils';
import { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';

const getActionsOrError = async ({
  actionsClient,
}: {
  actionsClient: ActionsClient;
}): Promise<
  | { allActions: ConnectorWithExtraFindData[]; bulkError: undefined }
  | { allActions: undefined; bulkError: BulkError }
> => {
  try {
    return {
      allActions: await actionsClient.getAll({ includeSystemActions: true }),
      bulkError: undefined,
    };
  } catch (exc) {
    return { allActions: undefined, bulkError: handleActionConnectorsErrors(exc) };
  }
};

export const checkRuleActions = async ({
  actionsClient,
  rules,
}: {
  actionsClient: ActionsClient;
  rules: RuleToImport[];
}): Promise<{ validatedActionRules: RuleToImport[]; missingActionErrors: BulkError[] }> => {
  if (!rules.some((rule) => rule.actions != null && rule.actions.length > 0)) {
    return { validatedActionRules: rules, missingActionErrors: [] };
  }

  const missingActionErrors: BulkError[] = [];
  const actionsOrError = await getActionsOrError({ actionsClient });
  const validatedActionRules = rules.filter((rule) => {
    if (rule.actions == null || rule.actions.length === 0) {
      return true;
    }

    // At this point we know the rule has actions. If we were able to fetch all actions,
    // verify that the actions referenced by the rule exist
    if (actionsOrError.allActions != null) {
      const allActions = actionsOrError.allActions;
      const missingActions = rule.actions.filter(
        (action) => !allActions.some((installedAction) => action.id === installedAction.id)
      );

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
    } else {
      // If we could not fetch all actions, push an error for the rule and exclude it from being imported
      missingActionErrors.push({
        id: rule.id,
        rule_id: rule.rule_id,
        error: actionsOrError.bulkError.error,
      });
      return false;
    }
  });

  return {
    validatedActionRules,
    missingActionErrors,
  };
};
