/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { EntityDefinitionsClient } from '@kbn/entity-store/server';
import { k8sDeploymentDefinition } from '../definitions/kubernetes/k8s_deployment';
import { hostLikeFixture, k8sNodeFixture } from './__fixtures__/definitions';
import { InventoryService } from './inventory_service';

type RegisteredDefinitions = Awaited<ReturnType<EntityDefinitionsClient['list']>>;

const createService = (definitions: RegisteredDefinitions) => {
  const list = jest.fn().mockResolvedValue(definitions);
  const logger = loggingSystemMock.createLogger();
  const service = new InventoryService({ list }, logger);
  return { service, list, logger };
};

describe('InventoryService.getTypes', () => {
  it('returns type, name, description, identity fields, columns and sources for k8s.deployment', async () => {
    const { service } = createService([k8sDeploymentDefinition]);

    const { types } = await service.getTypes();

    expect(types).toEqual([
      {
        type: 'k8s.deployment',
        name: k8sDeploymentDefinition.name,
        description: k8sDeploymentDefinition.description,
        identityFields: [
          'k8s.cluster.name',
          'k8s.namespace.name',
          'k8s.deployment.name',
          'orchestrator.cluster.name',
          'kubernetes.namespace',
          'kubernetes.deployment.name',
        ],
        columns: [
          { name: 'entity.id', kind: 'id' },
          { name: 'k8s.cluster.name', kind: 'identity' },
          { name: 'k8s.namespace.name', kind: 'identity' },
          { name: 'k8s.deployment.name', kind: 'identity' },
          { name: 'orchestrator.cluster.name', kind: 'identity' },
          { name: 'kubernetes.namespace', kind: 'identity' },
          { name: 'kubernetes.deployment.name', kind: 'identity' },
          { name: 'available_replicas', kind: 'attribute' },
          { name: 'desired_replicas', kind: 'attribute' },
          { name: 'paused', kind: 'attribute' },
          { name: 'app', kind: 'attribute' },
          { name: 'resource_id', kind: 'attribute' },
          { name: 'last_seen', kind: 'last_seen' },
        ],
        sources: [
          {
            indexPattern: 'metrics-kubernetes.state_deployment-*',
            filter: 'metricset.name == "state_deployment"',
          },
          { indexPattern: 'metrics-k8sclusterreceiver.otel-*' },
        ],
      },
    ]);
  });

  it('omits definitions without a dynamic block', async () => {
    const { dynamic, ...withoutDynamic } = k8sNodeFixture;
    const { service } = createService([withoutDynamic, hostLikeFixture]);

    const { types } = await service.getTypes();

    expect(types.map(({ type }) => type)).toEqual([hostLikeFixture.type]);
  });

  it('skips and warns on a definition that fails column derivation', async () => {
    const invalid = {
      ...k8sNodeFixture,
      dynamic: {
        sources: [
          {
            indexPattern: 'metrics-kubeletstatsreceiver.otel-default',
            attributes: [{ name: 'last_seen', field: 'host.os.name' }],
          },
        ],
      },
    };
    const { service, logger } = createService([invalid, hostLikeFixture]);

    const { types } = await service.getTypes();

    expect(types.map(({ type }) => type)).toEqual([hostLikeFixture.type]);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`"${invalid.type}"`));
  });

  it('rethrows errors from the definitions client', async () => {
    const { service, list } = createService([]);
    list.mockRejectedValue(new Error('registry unavailable'));

    await expect(service.getTypes()).rejects.toThrow('registry unavailable');
  });
});
