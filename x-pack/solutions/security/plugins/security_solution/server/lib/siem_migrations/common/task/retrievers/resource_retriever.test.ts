/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResourceRetriever } from './resource_retriever'; // Adjust path as needed
import type { ResourceIdentifierConstructor } from '../../../../../../common/siem_migrations/resources';
import { ResourceIdentifier } from '../../../../../../common/siem_migrations/resources';
import type { SiemMigrationsDataResourcesClient } from '../../data/siem_migrations_data_resources_client';
import type { RuleMigrationRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { ItemDocument } from '../../types';
import type { ExperimentalFeatures } from '../../../../../../common';

jest.mock('../../data/siem_migrations_data_resources_client');
jest.mock('../../../../../../common/siem_migrations/resources');

const migrationItem = {
  original_rule: {
    vendor: 'splunk',
  },
} as unknown as RuleMigrationRule;

const MockResourceIdentifierClass =
  ResourceIdentifier as unknown as jest.MockedClass<ResourceIdentifierConstructor>;

class TestResourceRetriever extends ResourceRetriever {
  protected ResourceIdentifierClass = MockResourceIdentifierClass;
}

const mockExperimentalFeatures = {
  splunkV2DashboardsEnabled: false,
} as unknown as ExperimentalFeatures;

const defaultResourceIdentifier = () =>
  ({
    fromOriginal: jest.fn().mockResolvedValue([]),
    fromResources: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<ResourceIdentifier<ItemDocument>>);

describe('ResourceRetriever', () => {
  let retriever: ResourceRetriever;
  let mockDataClient: jest.Mocked<SiemMigrationsDataResourcesClient>;
  let mockResourceIdentifier: jest.Mocked<ResourceIdentifier<ItemDocument>>;

  beforeEach(() => {
    mockDataClient = {
      searchBatches: jest.fn().mockReturnValue({ next: jest.fn(() => []) }),
    } as unknown as jest.Mocked<SiemMigrationsDataResourcesClient>;

    MockResourceIdentifierClass.mockImplementation(defaultResourceIdentifier);
    mockResourceIdentifier = new MockResourceIdentifierClass('splunk', {
      experimentalFeatures: mockExperimentalFeatures,
    }) as jest.Mocked<ResourceIdentifier<ItemDocument>>;

    retriever = new TestResourceRetriever('mockMigrationId', MockResourceIdentifierClass, {
      resourcesDataClient: mockDataClient,
      experimentalFeatures: mockExperimentalFeatures,
    });
  });

  it('throws an error if initialize is not called before getResources', async () => {
    await expect(retriever.getResources(migrationItem.original_rule)).rejects.toThrow(
      'initialize must be called before calling getResources'
    );
  });

  it('returns an empty object if no matching resources are found', async () => {
    // Mock the resource identifier to return no resources
    mockResourceIdentifier.fromOriginal.mockResolvedValue([]);
    await retriever.initialize(); // Pretend initialize has been called

    const result = await retriever.getResources(migrationItem.original_rule);
    expect(result).toEqual({});
  });

  it('returns matching macro and lookup resources', async () => {
    const mockExistingResources = {
      macro: { macro1: { name: 'macro1', type: 'macro' } },
      lookup: { lookup1: { name: 'lookup1', type: 'lookup' } },
    };
    // Inject existing resources manually
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (retriever as any).existingResources = mockExistingResources;

    const mockResourcesIdentified = [
      { name: 'macro1', type: 'macro' as const },
      { name: 'lookup1', type: 'lookup' as const },
    ];
    MockResourceIdentifierClass.mockImplementation(
      () =>
        ({
          ...defaultResourceIdentifier(),
          fromOriginal: jest.fn().mockReturnValue(mockResourcesIdentified),
        } as unknown as jest.Mocked<ResourceIdentifier<ItemDocument>>)
    );

    const result = await retriever.getResources(migrationItem.original_rule);
    expect(result).toEqual({
      macro: [{ name: 'macro1', type: 'macro' }],
      lookup: [{ name: 'lookup1', type: 'lookup' }],
    });
  });

  it('handles nested resources properly', async () => {
    const mockExistingResources = {
      macro: {
        macro1: { name: 'macro1', type: 'macro' },
        macro2: { name: 'macro2', type: 'macro' },
      },
      lookup: {
        lookup1: { name: 'lookup1', type: 'lookup' },
        lookup2: { name: 'lookup2', type: 'lookup' },
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (retriever as any).existingResources = mockExistingResources;

    const mockResourcesIdentifiedFromRule = [
      { name: 'macro1', type: 'macro' as const },
      { name: 'lookup1', type: 'lookup' as const },
    ];

    const mockNestedResources = [
      { name: 'macro2', type: 'macro' as const },
      { name: 'lookup2', type: 'lookup' as const },
    ];

    MockResourceIdentifierClass.mockImplementation(
      () =>
        ({
          ...defaultResourceIdentifier(),
          fromOriginal: jest.fn().mockResolvedValue(mockResourcesIdentifiedFromRule),
          fromResources: jest.fn().mockResolvedValue([]).mockResolvedValueOnce(mockNestedResources),
        } as unknown as jest.Mocked<ResourceIdentifier<ItemDocument>>)
    );

    const result = await retriever.getResources(migrationItem.original_rule);
    expect(result).toEqual({
      macro: [
        { name: 'macro1', type: 'macro' },
        { name: 'macro2', type: 'macro' },
      ],
      lookup: [
        { name: 'lookup1', type: 'lookup' },
        { name: 'lookup2', type: 'lookup' },
      ],
    });
  });
});
