/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

export const INITIALIZATION_FLOW_STATE_SO_TYPE = 'security-solution-initialization-flow';

export interface InitializationFlowStateAttributes {
  status: 'pending' | 'running' | 'ready' | 'error';
  error?: string;
  updatedAt: string;
}

export const initializationFlowStateType: SavedObjectsType = {
  name: INITIALIZATION_FLOW_STATE_SO_TYPE,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      status: { type: 'keyword' },
      error: { type: 'text' },
      updatedAt: { type: 'date' },
    },
  },
};

export const getFlowSoId = (flowId: string, spaceId: string): string =>
  `security-init-${flowId}-${spaceId}`;
