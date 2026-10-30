/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_TYPE_SOURCES, type ActionType } from '@kbn/actions-types';

// Same value as TEST_CONNECTOR_SUB_ACTION; the @kbn/connector-specs root entry would bundle every spec.
const TEST_CONNECTOR_SUB_ACTION = '_test';

export interface InitialSandboxConnector {
  actionTypeId: string;
  config?: { selectedActions: string[] };
}

/**
 * The connector the Nightshift add flyouts start from. Spec connectors default to their `_test`
 * sub-action only: the investigation sandbox uses the connector's credentials, not its sub-actions.
 */
export const getInitialSandboxConnector = (
  actionType: Pick<ActionType, 'id' | 'source'>
): InitialSandboxConnector => {
  if (actionType.source !== ACTION_TYPE_SOURCES.spec) {
    return { actionTypeId: actionType.id };
  }
  return {
    actionTypeId: actionType.id,
    config: { selectedActions: [TEST_CONNECTOR_SUB_ACTION] },
  };
};
