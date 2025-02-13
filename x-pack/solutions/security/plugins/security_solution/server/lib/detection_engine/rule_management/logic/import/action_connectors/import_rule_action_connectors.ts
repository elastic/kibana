/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Readable } from 'stream';

import type { SavedObjectsImportResponse } from '@kbn/core-saved-objects-common';
import type { SavedObject } from '@kbn/core-saved-objects-server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';

import type { RuleToImport } from '../../../../../../../common/api/detection_engine/rule_management';
import type { WarningSchema } from '../../../../../../../common/api/detection_engine';
import {
  checkIfActionsHaveMissingConnectors,
  filterExistingActionConnectors,
  getActionConnectorRules,
  handleActionsHaveNoConnectors,
  mapSOErrorToRuleError,
  returnErroredImportResult,
  updateRuleActionsWithMigratedResults,
} from './utils';
import type { ImportRuleActionConnectorsParams, ImportRuleActionConnectorsResult } from './types';

const NO_ACTION_RESULT = {
  success: true,
  errors: [],
  successCount: 0,
  warnings: [],
};

export const importRuleActionConnectors = async ({
  actionConnectors,
  actionsClient,
  actionsImporter,
  rules,
  overwrite,
}: ImportRuleActionConnectorsParams): Promise<ImportRuleActionConnectorsResult> => {
  try {
    const connectorIdToRuleIdsMap = getActionConnectorRules(rules);
    const referencedConnectorIds = await filterOutPreconfiguredConnectors(
      actionsClient,
      Object.keys(connectorIdToRuleIdsMap)
    );

    if (!referencedConnectorIds.length) {
      return NO_ACTION_RESULT;
    }

    if (overwrite && !actionConnectors.length) {
      return handleActionsHaveNoConnectors(referencedConnectorIds, connectorIdToRuleIdsMap);
    }

    let actionConnectorsToImport: SavedObject[] = actionConnectors;

    if (!overwrite) {
      const newIdsToAdd = await filterExistingActionConnectors(
        actionsClient,
        referencedConnectorIds
      );

      const foundMissingConnectors = checkIfActionsHaveMissingConnectors(
        actionConnectors,
        newIdsToAdd,
        connectorIdToRuleIdsMap
      );
      if (foundMissingConnectors) return foundMissingConnectors;
      // filter out existing connectors
      actionConnectorsToImport = actionConnectors.filter(({ id }) => newIdsToAdd.includes(id));
    }
    if (!actionConnectorsToImport.length) {
      return NO_ACTION_RESULT;
    }

    const readStream = Readable.from(actionConnectorsToImport);
    const { success, successCount, successResults, warnings, errors }: SavedObjectsImportResponse =
      await actionsImporter.import({
        readStream,
        overwrite,
        createNewCopies: false,
      });
    /*
      // When a connector is exported from one namespace and imported to another, it does not result in an error, but instead a new object is created with
      // new destination id and id will have the old  origin id, so in order to be able to use the newly generated Connectors id, this util is used to swap the old id with the
      // new destination Id
      */
    let rulesWithMigratedActions: Array<RuleToImport | Error> | undefined;
    if (successResults?.some((res) => res.destinationId))
      rulesWithMigratedActions = updateRuleActionsWithMigratedResults(rules, successResults);

    return {
      success,
      successCount,
      errors: errors ? mapSOErrorToRuleError(errors) : [],
      warnings: (warnings as WarningSchema[]) || [],
      rulesWithMigratedActions,
    };
  } catch (error) {
    return returnErroredImportResult(error);
  }
};

async function fetchPreconfiguredActionConnectors(
  actionsClient: ActionsClient
): Promise<ConnectorWithExtraFindData[]> {
  const knownConnectors = await actionsClient.getAll({ includeSystemActions: true });

  return knownConnectors.filter((c) => c.isPreconfigured || c.isSystemAction);
}

async function filterOutPreconfiguredConnectors(
  actionsClient: ActionsClient,
  connectorsIds: string[]
): Promise<string[]> {
  if (connectorsIds.length === 0) {
    return [];
  }

  const preconfiguredActionConnectors = await fetchPreconfiguredActionConnectors(actionsClient);
  const preconfiguredActionConnectorIds = new Set(preconfiguredActionConnectors.map((c) => c.id));

  return connectorsIds.filter((id) => !preconfiguredActionConnectorIds.has(id));
}
