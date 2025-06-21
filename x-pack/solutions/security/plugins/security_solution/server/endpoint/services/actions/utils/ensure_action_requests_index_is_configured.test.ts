/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockEndpointAppContextService } from '../../../mocks';
import { ensureActionRequestsIndexIsConfigured } from '../..';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../../common/endpoint/constants';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

describe('ensureActionRequestsIndexIsConfigured()', () => {
  let endpointServiceMock: ReturnType<typeof createMockEndpointAppContextService>;
  let esClientMock: ElasticsearchClientMock;

  beforeEach(() => {
    endpointServiceMock = createMockEndpointAppContextService();
    esClientMock = endpointServiceMock.getInternalEsClient() as ElasticsearchClientMock;

    esClientMock.indices.getMapping.mockResolvedValue({
      '.ds-.logs-endpoint.actions-default-2025.06.13-000001': {
        mappings: { properties: {} },
      },
    });

    esClientMock.cluster.existsComponentTemplate.mockResolvedValue(true);

    esClientMock.cluster.getComponentTemplate.mockResolvedValue({
      component_templates: [
        {
          name: '.logs-endpoint.actions@package',
          component_template: {
            template: {
              settings: {},
              mappings: {
                dynamic: false,
                properties: {
                  agent: {
                    properties: {},
                  },
                },
              },
            },
            _meta: {
              package: { name: 'endpoint' },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
      ],
    });
  });

  it('should ensure index for DS exists', async () => {
    await expect(
      ensureActionRequestsIndexIsConfigured(endpointServiceMock)
    ).resolves.toBeUndefined();

    expect(endpointServiceMock.getInternalEsClient().indices.createDataStream).toHaveBeenCalledWith(
      {
        name: ENDPOINT_ACTIONS_INDEX,
      }
    );
  });

  it(`should do nothing if space awareness feature is disabled`, async () => {
    // @ts-expect-error
    endpointServiceMock.experimentalFeatures.endpointManagementSpaceAwarenessEnabled = false;

    await expect(
      ensureActionRequestsIndexIsConfigured(endpointServiceMock)
    ).resolves.toBeUndefined();

    expect(
      endpointServiceMock.getInternalEsClient().indices.getFieldMapping
    ).not.toHaveBeenCalled();
  });

  describe('and space awareness feature is enabled', () => {
    beforeEach(() => {
      // @ts-expect-error
      endpointServiceMock.experimentalFeatures.endpointManagementSpaceAwarenessEnabled = true;
    });

    it('should add mappings to DS index if they are missing', async () => {
      await expect(
        ensureActionRequestsIndexIsConfigured(endpointServiceMock)
      ).resolves.toBeUndefined();

      expect(esClientMock.indices.putMapping).toHaveBeenCalledWith({
        index: ENDPOINT_ACTIONS_INDEX,
        properties: {
          agent: {
            properties: {
              policy: {
                properties: {
                  agentId: { ignore_above: 1024, type: 'keyword' },
                  agentPolicyId: { ignore_above: 1024, type: 'keyword' },
                  elasticAgentId: { ignore_above: 1024, type: 'keyword' },
                  integrationPolicyId: { ignore_above: 1024, type: 'keyword' },
                },
              },
            },
          },
          originSpaceId: { ignore_above: 1024, type: 'keyword' },
          tags: { type: 'keyword', ignore_above: 1024 },
        },
      });
    });

    it('should not add mappings to DS index if they already exist', async () => {
      esClientMock.indices.getMapping.mockResolvedValue({
        '.ds-.logs-endpoint.actions-default-2025.06.13-000001': {
          mappings: {
            properties: {
              tags: { type: 'keyword' },
              originSpaceId: { ignore_above: 1024, type: 'keyword' },
              agent: {
                properties: {
                  policy: {},
                },
              },
            },
          },
        },
      });

      await expect(
        ensureActionRequestsIndexIsConfigured(endpointServiceMock)
      ).resolves.toBeUndefined();

      expect(esClientMock.indices.putMapping).not.toHaveBeenCalled();
    });

    it('should add mappings to index component template if missing', async () => {
      await expect(
        ensureActionRequestsIndexIsConfigured(endpointServiceMock)
      ).resolves.toBeUndefined();

      expect(esClientMock.cluster.putComponentTemplate).toHaveBeenCalledWith({
        name: '.logs-endpoint.actions@package',
        template: {
          mappings: {
            dynamic: false,
            properties: {
              agent: {
                properties: {
                  policy: {
                    properties: {
                      agentId: { ignore_above: 1024, type: 'keyword' },
                      agentPolicyId: { ignore_above: 1024, type: 'keyword' },
                      elasticAgentId: { ignore_above: 1024, type: 'keyword' },
                      integrationPolicyId: { ignore_above: 1024, type: 'keyword' },
                    },
                  },
                },
              },
              originSpaceId: { ignore_above: 1024, type: 'keyword' },
              tags: { type: 'keyword', ignore_above: 1024 },
            },
          },
        },
      });
    });

    it('should not add mappings to index component template if they already exists', async () => {
      esClientMock.cluster.getComponentTemplate.mockResolvedValue({
        component_templates: [
          {
            name: '.logs-endpoint.actions@package',
            component_template: {
              template: {
                settings: {},
                mappings: {
                  dynamic: false,
                  properties: {
                    agent: { properties: { policy: {} } },
                    originSpaceId: { ignore_above: 1024, type: 'keyword' },
                    tags: { type: 'keyword' },
                  },
                },
              },
              _meta: { package: { name: 'endpoint' }, managed_by: 'fleet', managed: true },
            },
          },
        ],
      });

      await expect(
        ensureActionRequestsIndexIsConfigured(endpointServiceMock)
      ).resolves.toBeUndefined();

      expect(esClientMock.cluster.putComponentTemplate).not.toHaveBeenCalled();
    });
  });
});
