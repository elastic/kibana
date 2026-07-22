/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUpdateAssetCriticalityStepDefinition } from './update_asset_criticality';
import { ExecutionError } from '@kbn/workflows/server';
import type {
  StepHandlerContext,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { getEntitiesAlias, getLatestEntityIndexPattern, ENTITY_LATEST } from '../../../common';
import { MAX_WORKFLOW_MESSAGE_LENGTH } from '../../../common/workflow/steps/update_asset_criticality';
import type { EntityStoreStartContract } from '../../types';

const fakeRequest = { fake: true };

const buildCheckPrivilegesResponse = (authorized: boolean, spaceId = 'default') => {
  const entitiesAlias = getEntitiesAlias(ENTITY_LATEST, spaceId);
  const latestIndexPattern = getLatestEntityIndexPattern(spaceId);
  return {
    hasAllRequested: authorized,
    privileges: {
      elasticsearch: {
        cluster: [],
        index: {
          [entitiesAlias]: [
            { privilege: 'read', authorized },
            { privilege: 'write', authorized },
          ],
          [latestIndexPattern]: [
            { privilege: 'read', authorized },
            { privilege: 'write', authorized },
          ],
        },
      },
      kibana: [
        { privilege: 'api:securitySolution', authorized },
        { privilege: 'api:securitySolution-entity-analytics', authorized },
      ],
    },
  };
};

const createMockContext = (
  input: Record<string, unknown>,
  esClient: unknown = {},
  config: Record<string, unknown> = {},
  callKibanaApi: jest.Mock = jest.fn()
) => {
  return {
    input,
    config,
    rawInput: input,
    contextManager: {
      getContext: jest.fn().mockReturnValue({ workflow: { spaceId: 'default' } }),
      getScopedEsClient: jest.fn().mockReturnValue(esClient),
      renderInputTemplate: jest.fn(),
      getFakeRequest: jest.fn().mockReturnValue(fakeRequest),
      callKibanaApi,
    },
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    abortSignal: new AbortController().signal,
    stepId: 'test-step',
    stepType: 'entityStore.updateAssetCriticality',
  } as unknown as StepHandlerContext<unknown, unknown>;
};

describe('updateAssetCriticalityStepDefinition', () => {
  const updateEntity = jest.fn();
  const createCRUDClient = jest
    .fn()
    .mockReturnValue({ updateEntity }) as unknown as EntityStoreStartContract['createCRUDClient'];
  const getCreateCRUDClient = jest.fn(async () => createCRUDClient);
  const getClient = jest.fn();
  const getWorkflowsExtensionsStart = jest.fn(
    async () =>
      ({
        getClient,
      } as unknown as WorkflowsExtensionsServerPluginStart)
  );
  const getLicense = jest.fn().mockResolvedValue({ hasAtLeast: () => true });
  const getLicensingStart = jest.fn(
    async () => ({ getLicense } as unknown as LicensingPluginStart)
  );
  const checkPrivileges = jest.fn().mockResolvedValue(buildCheckPrivilegesResponse(true));
  const checkPrivilegesDynamicallyWithRequest = jest.fn().mockReturnValue(checkPrivileges);
  const getSecurityStart = jest.fn(
    async () =>
      ({
        authz: {
          checkPrivilegesDynamicallyWithRequest,
          actions: { api: { get: (privilege: string) => `api:${privilege}` } },
        },
      } as unknown as SecurityPluginStart)
  );

  const updateAssetCriticalityStepDefinition = getUpdateAssetCriticalityStepDefinition(
    getCreateCRUDClient,
    getWorkflowsExtensionsStart,
    getLicensingStart,
    getSecurityStart
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (createCRUDClient as jest.Mock).mockReturnValue({ updateEntity });
    getCreateCRUDClient.mockImplementation(async () => createCRUDClient);
    updateEntity.mockResolvedValue(undefined);
    getLicense.mockResolvedValue({ hasAtLeast: () => true });
    checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    checkPrivileges.mockResolvedValue(buildCheckPrivilegesResponse(true));
  });

  describe('handler', () => {
    it('updates the entity via the Entity Store v2 CRUD client, forcing the criticality field', async () => {
      updateEntity.mockResolvedValue(undefined);
      const esClient = {};
      const mockContext = createMockContext(
        {
          entity_type: 'host',
          entity_id: 'host:my-host',
          criticality_level: 'high_impact',
        },
        esClient
      );

      const result = await updateAssetCriticalityStepDefinition.handler(mockContext);

      expect(createCRUDClient).toHaveBeenCalledWith(esClient, 'default', expect.any(Function));
      expect(updateEntity).toHaveBeenCalledWith(
        'host',
        { entity: { id: 'host:my-host' }, asset: { criticality: 'high_impact' } },
        true
      );
      expect(result).toEqual({
        output: {
          success: true,
          message: 'Successfully set criticality level to "high_impact" for entity host:my-host',
        },
      });
    });

    it('removes the criticality level when criticality_level is null', async () => {
      updateEntity.mockResolvedValue(undefined);
      const esClient = {};
      const mockContext = createMockContext(
        {
          entity_type: 'host',
          entity_id: 'host:my-host',
          criticality_level: null,
        },
        esClient
      );

      const result = await updateAssetCriticalityStepDefinition.handler(mockContext);

      expect(updateEntity).toHaveBeenCalledWith(
        'host',
        { entity: { id: 'host:my-host' }, asset: { criticality: null } },
        true
      );
      expect(result).toEqual({
        output: {
          success: true,
          message: 'Successfully removed criticality level for entity host:my-host',
        },
      });
    });

    it('wires up a workflows client so the update emits a workflow trigger event', async () => {
      const mockContext = createMockContext({
        entity_type: 'host',
        entity_id: 'host:my-host',
        criticality_level: 'high_impact',
      });

      await updateAssetCriticalityStepDefinition.handler(mockContext);

      const getWorkflowsClient = (createCRUDClient as jest.Mock).mock.calls[0][2];
      await getWorkflowsClient();

      expect(getClient).toHaveBeenCalledWith(fakeRequest);
    });

    it('does not pass a workflows client getter when workflowsExtensions is unavailable', async () => {
      // @ts-ignore
      getWorkflowsExtensionsStart.mockResolvedValueOnce(undefined);
      const esClient = {};
      const mockContext = createMockContext(
        {
          entity_type: 'host',
          entity_id: 'host:my-host',
          criticality_level: 'high_impact',
        },
        esClient
      );

      await updateAssetCriticalityStepDefinition.handler(mockContext);

      expect(createCRUDClient).toHaveBeenCalledWith(esClient, 'default', undefined);
    });

    it('should throw ExecutionError if the CRUD client throws', async () => {
      updateEntity.mockRejectedValue(new Error('not found'));
      const mockContext = createMockContext({
        entity_type: 'host',
        entity_id: 'host:my-host',
        criticality_level: 'high_impact',
      });

      await expect(updateAssetCriticalityStepDefinition.handler(mockContext)).rejects.toThrow(
        ExecutionError
      );
    });

    it('checks write privileges on the entities indices before updating', async () => {
      const mockContext = createMockContext({
        entity_type: 'host',
        entity_id: 'host:my-host',
        criticality_level: 'high_impact',
      });

      await updateAssetCriticalityStepDefinition.handler(mockContext);

      expect(checkPrivilegesDynamicallyWithRequest).toHaveBeenCalledWith(fakeRequest);
      expect(checkPrivileges).toHaveBeenCalledWith({
        elasticsearch: {
          cluster: [],
          index: {
            [getEntitiesAlias(ENTITY_LATEST, 'default')]: ['read', 'write'],
            [getLatestEntityIndexPattern('default')]: ['read', 'write'],
          },
        },
        kibana: ['api:securitySolution', 'api:securitySolution-entity-analytics'],
      });
      expect(updateEntity).toHaveBeenCalled();
    });

    it('throws a PermissionError ExecutionError and does not update the entity when the caller lacks write access', async () => {
      checkPrivileges.mockResolvedValueOnce(buildCheckPrivilegesResponse(false));
      const mockContext = createMockContext({
        entity_type: 'host',
        entity_id: 'host:my-host',
        criticality_level: 'high_impact',
      });

      await expect(updateAssetCriticalityStepDefinition.handler(mockContext)).rejects.toMatchObject(
        {
          type: 'PermissionError',
        }
      );
      expect(updateEntity).not.toHaveBeenCalled();
    });

    it('throws a PermissionError ExecutionError and does not update the entity when the caller has write access but lacks the Kibana feature privilege', async () => {
      checkPrivileges.mockResolvedValueOnce({
        ...buildCheckPrivilegesResponse(true),
        privileges: {
          ...buildCheckPrivilegesResponse(true).privileges,
          kibana: [
            { privilege: 'api:securitySolution', authorized: false },
            { privilege: 'api:securitySolution-entity-analytics', authorized: false },
          ],
        },
      });
      const mockContext = createMockContext({
        entity_type: 'host',
        entity_id: 'host:my-host',
        criticality_level: 'high_impact',
      });

      await expect(updateAssetCriticalityStepDefinition.handler(mockContext)).rejects.toMatchObject(
        {
          type: 'PermissionError',
        }
      );
      expect(updateEntity).not.toHaveBeenCalled();
    });
  });

  describe('risk score recalculation', () => {
    const input = {
      entity_type: 'host',
      entity_id: 'host:my-host',
      criticality_level: 'high_impact',
    };

    it('triggers recalculation when configured and the license is at least platinum', async () => {
      const callKibanaApi = jest.fn().mockResolvedValue({ status: 200, headers: {}, body: {} });
      const mockContext = createMockContext(
        input,
        {},
        { 'recalculate-risk-score': true },
        callKibanaApi
      );

      const result = await updateAssetCriticalityStepDefinition.handler(mockContext);

      expect(callKibanaApi).toHaveBeenCalledWith({
        method: 'POST',
        path: '/internal/risk_score/calculation/entity_v2',
        headers: { 'elastic-api-version': '1' },
        body: {
          identifier: 'host:my-host',
          identifier_type: 'host',
          entity_id: 'host:my-host',
        },
      });
      expect(result).toEqual({
        output: {
          success: true,
          message:
            'Successfully set criticality level to "high_impact" for entity host:my-host and triggered risk score recalculation',
        },
      });
    });

    it('does not trigger recalculation when the config flag is false', async () => {
      const callKibanaApi = jest.fn();
      const mockContext = createMockContext(
        input,
        {},
        { 'recalculate-risk-score': false },
        callKibanaApi
      );

      await updateAssetCriticalityStepDefinition.handler(mockContext);

      expect(callKibanaApi).not.toHaveBeenCalled();
    });

    it('does not trigger recalculation when the license is below platinum and notes it in the message', async () => {
      getLicense.mockResolvedValueOnce({ hasAtLeast: () => false });
      const callKibanaApi = jest.fn();
      const mockContext = createMockContext(
        input,
        {},
        { 'recalculate-risk-score': true },
        callKibanaApi
      );

      const result = await updateAssetCriticalityStepDefinition.handler(mockContext);

      expect(callKibanaApi).not.toHaveBeenCalled();
      expect(result).toEqual({
        output: {
          success: true,
          message:
            'Successfully set criticality level to "high_impact" for entity host:my-host ' +
            'but skipped risk score recalculation because it requires at least a platinum license',
        },
      });
    });

    it('still reports success and notes the failure in the message if the recalculation call fails', async () => {
      const callKibanaApi = jest.fn().mockRejectedValue(new Error('risk engine not configured'));
      const mockContext = createMockContext(
        input,
        {},
        { 'recalculate-risk-score': true },
        callKibanaApi
      );

      const result = await updateAssetCriticalityStepDefinition.handler(mockContext);

      expect(result).toEqual({
        output: {
          success: true,
          message:
            'Successfully set criticality level to "high_impact" for entity host:my-host ' +
            'but risk score recalculation failed: risk engine not configured',
        },
      });
    });

    it('truncates the output message to stay within the schema limit, even with a long entity_id and a long recalculation error', async () => {
      const longEntityId = `host:${'a'.repeat(990)}`;
      const callKibanaApi = jest.fn().mockRejectedValue(new Error('x'.repeat(5000)));
      const mockContext = createMockContext(
        { ...input, entity_id: longEntityId },
        {},
        { 'recalculate-risk-score': true },
        callKibanaApi
      );

      const result = await updateAssetCriticalityStepDefinition.handler(mockContext);
      const { output } = result;

      expect(output).toBeDefined();
      expect(output?.success).toBe(true);
      expect(output?.message).toBeDefined();
      expect(output?.message?.length).toBeLessThanOrEqual(MAX_WORKFLOW_MESSAGE_LENGTH);
      expect(output?.message?.endsWith('…')).toBe(true);
    });
  });
});
