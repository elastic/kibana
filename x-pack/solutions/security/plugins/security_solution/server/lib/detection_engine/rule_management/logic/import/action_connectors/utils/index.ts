/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { pick } from 'lodash';
import type {
  SavedObjectsImportFailure,
  SavedObjectsImportSuccess,
} from '@kbn/core-saved-objects-common';
import type { SavedObject } from '@kbn/core-saved-objects-server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { BulkError } from '../../../../../routes/utils';
import { createBulkErrorObject } from '../../../../../routes/utils';
import type { RuleToImport } from '../../../../../../../../common/api/detection_engine/rule_management';
import type {
  ActionRules,
  ConflictError,
  ErrorType,
  ImportRuleActionConnectorsResult,
  SOError,
} from '../types';

export const returnErroredImportResult = (error: ErrorType): ImportRuleActionConnectorsResult => ({
  success: false,
  errors: [handleActionConnectorsErrors(error)],
  successCount: 0,
  warnings: [],
});

export const handleActionsHaveNoConnectors = (
  actionsIds: string[],
  actionConnectorRules: ActionRules
): ImportRuleActionConnectorsResult => {
  const ruleIds: string = [...new Set(Object.values(actionConnectorRules).flat())].join();

  if (actionsIds && actionsIds.length) {
    const errors: BulkError[] = [];
    const errorMessage =
      actionsIds.length > 1
        ? 'connectors are missing. Connector ids missing are:'
        : 'connector is missing. Connector id missing is:';
    errors.push(
      createBulkErrorObject({
        id: actionsIds.join(),
        statusCode: 404,
        message: `${actionsIds.length} ${errorMessage} ${actionsIds.join(', ')}`,
        ruleId: ruleIds,
      })
    );
    return {
      success: false,
      errors,
      successCount: 0,
      warnings: [],
    };
  }
  return {
    success: true,
    errors: [],
    successCount: 0,
    warnings: [],
  };
};

export const handleActionConnectorsErrors = (error: ErrorType, id?: string): BulkError => {
  let statusCode: number | null = null;
  let message: string = '';
  if ('output' in error) {
    statusCode = (error as SOError).output.statusCode;
    message = (error as SOError).output.payload?.message;
  }
  switch (statusCode) {
    case null:
      return createBulkErrorObject({
        statusCode: 500,
        message:
          (error as ConflictError)?.type === 'conflict'
            ? 'There is a conflict'
            : (error as Error).message
            ? (error as Error).message
            : '',
      });

    case 403:
      return createBulkErrorObject({
        id,
        statusCode,
        message: `You may not have actions privileges required to import rules with actions: ${message}`,
      });

    default:
      return createBulkErrorObject({
        id,
        statusCode,
        message,
      });
  }
};

export const mapSOErrorToRuleError = (errors: SavedObjectsImportFailure[]): BulkError[] => {
  return errors.map(({ id, error }) => handleActionConnectorsErrors(error, id));
};

export const filterExistingActionConnectors = async (
  actionsClient: ActionsClient,
  actionsIds: string[]
) => {
  const storedConnectors = await actionsClient.getAll();
  const storedActionIds: string[] = storedConnectors.map(({ id }) => id);
  return actionsIds.filter((id) => !storedActionIds.includes(id));
};
export const getActionConnectorRules = (rules: Array<RuleToImport | Error>) =>
  rules.reduce((acc: { [actionsIds: string]: string[] }, rule) => {
    if (rule instanceof Error) return acc;
    rule.actions?.forEach(({ id }) => (acc[id] = [...(acc[id] || []), rule.rule_id]));
    return acc;
  }, {});
export const checkIfActionsHaveMissingConnectors = (
  actionConnectors: SavedObject[],
  newIdsToAdd: string[],
  actionConnectorRules: ActionRules
) => {
  // if new action-connectors don't have exported connectors will fail with missing connectors
  if (actionConnectors.length < newIdsToAdd.length) {
    const actionConnectorsIds = actionConnectors.map(({ id }) => id);
    const missingActionConnector = newIdsToAdd.filter((id) => !actionConnectorsIds.includes(id));
    const missingActionRules = pick(actionConnectorRules, [...missingActionConnector]);
    return handleActionsHaveNoConnectors(missingActionConnector, missingActionRules);
  }
  return null;
};

export const mapActionIdToNewDestinationId = (
  connectorsImportResult: SavedObjectsImportSuccess[]
) => {
  return connectorsImportResult.reduce(
    (acc: { [actionId: string]: string }, { destinationId, id }) => {
      acc[id] = destinationId || id;
      return acc;
    },
    {}
  );
};

export const swapNonDefaultSpaceIdWithDestinationId = (
  rule: RuleToImport,
  actionIdDestinationIdLookup: { [actionId: string]: string }
) => {
  return rule.actions?.map((action) => {
    const destinationId = actionIdDestinationIdLookup[action.id];
    return { ...action, id: destinationId };
  });
};
/*
// When a connector is exported from one namespace and imported to another, it does not result in an error, but instead a new object is created with
// new destination id and id will have the old  origin id, so in order to be able to use the newly generated Connectors id, this util is used to swap the old id with the
// new destination Id
*/
export const updateRuleActionsWithMigratedResults = (
  rules: Array<RuleToImport | Error>,
  connectorsImportResult: SavedObjectsImportSuccess[]
): Array<RuleToImport | Error> => {
  const actionIdDestinationIdLookup = mapActionIdToNewDestinationId(connectorsImportResult);
  return rules.map((rule) => {
    if (rule instanceof Error) return rule;
    return {
      ...rule,
      actions: swapNonDefaultSpaceIdWithDestinationId(rule, actionIdDestinationIdLookup),
    };
  });
};
