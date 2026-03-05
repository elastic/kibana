/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  InitializationFlowId,
  InitializationFlowStatus,
} from '../../../../common/api/initialization';
import {
  INITIALIZATION_FLOW_STATE_SO_TYPE,
  getFlowSoId,
  type InitializationFlowStateAttributes,
} from './initialization_flow_state_type';

export interface FlowState {
  status: InitializationFlowStatus;
  error?: string;
  updatedAt: string;
}

export class InitializationFlowStateClient {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly spaceId: string
  ) {}

  async get(flowId: InitializationFlowId): Promise<FlowState | undefined> {
    try {
      const so = await this.soClient.get<InitializationFlowStateAttributes>(
        INITIALIZATION_FLOW_STATE_SO_TYPE,
        getFlowSoId(flowId, this.spaceId)
      );
      return {
        status: so.attributes.status,
        error: so.attributes.error,
        updatedAt: so.attributes.updatedAt,
      };
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        return undefined;
      }
      throw err;
    }
  }

  async getAll(flowIds: InitializationFlowId[]): Promise<Record<string, FlowState>> {
    const results: Record<string, FlowState> = {};
    const resolveResults = await this.soClient.bulkResolve<InitializationFlowStateAttributes>(
      flowIds.map((flowId) => ({
        type: INITIALIZATION_FLOW_STATE_SO_TYPE,
        id: getFlowSoId(flowId, this.spaceId),
      }))
    );

    for (let i = 0; i < flowIds.length; i++) {
      const resolved = resolveResults.resolved_objects[i];
      if (resolved.saved_object.error) {
        results[flowIds[i]] = { status: 'not_requested', updatedAt: '' };
      } else {
        const attrs = resolved.saved_object.attributes;
        results[flowIds[i]] = {
          status: attrs.status,
          error: attrs.error,
          updatedAt: attrs.updatedAt,
        };
      }
    }

    return results;
  }

  async setPending(flowId: InitializationFlowId): Promise<void> {
    await this.soClient.create<InitializationFlowStateAttributes>(
      INITIALIZATION_FLOW_STATE_SO_TYPE,
      {
        status: 'pending',
        updatedAt: new Date().toISOString(),
      },
      {
        id: getFlowSoId(flowId, this.spaceId),
        overwrite: true,
      }
    );
  }

  async setRunning(flowId: InitializationFlowId): Promise<void> {
    await this.soClient.update<InitializationFlowStateAttributes>(
      INITIALIZATION_FLOW_STATE_SO_TYPE,
      getFlowSoId(flowId, this.spaceId),
      {
        status: 'running',
        updatedAt: new Date().toISOString(),
      }
    );
  }

  async setReady(flowId: InitializationFlowId): Promise<void> {
    await this.soClient.update<InitializationFlowStateAttributes>(
      INITIALIZATION_FLOW_STATE_SO_TYPE,
      getFlowSoId(flowId, this.spaceId),
      {
        status: 'ready',
        error: undefined,
        updatedAt: new Date().toISOString(),
      }
    );
  }

  async setError(flowId: InitializationFlowId, error: string): Promise<void> {
    await this.soClient.update<InitializationFlowStateAttributes>(
      INITIALIZATION_FLOW_STATE_SO_TYPE,
      getFlowSoId(flowId, this.spaceId),
      {
        status: 'error',
        error,
        updatedAt: new Date().toISOString(),
      }
    );
  }
}
