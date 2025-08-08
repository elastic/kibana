/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResourceRetriever } from './resource_retriever'; // Adjust path as needed
import type { ResourceIdentifierClass } from '../../../../../../common/siem_migrations/resources/resource_identifier';
import { ResourceIdentifier } from '../../../../../../common/siem_migrations/resources/resource_identifier';
import type { SiemMigrationsDataResourcesClient } from '../../data/siem_migrations_data_resources_client';
import type { ItemDocument } from '../../../../../../common/siem_migrations/types';

jest.mock('../../data/siem_migrations_data_resources_client');
jest.mock('../../../../../../common/siem_migrations/resources/resource_identifier');

const migrationItem = {} as unknown as ItemDocument;

const MockResourceIdentifier = ResourceIdentifier as jest.MockedClass<ResourceIdentifierClass>;

class TestResourceRetriever extends ResourceRetriever {
  protected ResourceIdentifierClass = MockResourceIdentifier;
}

const defaultResourceIdentifier = () =>
  ({
    getVendor: jest.fn().mockReturnValue('splunk'),
    fromOriginal: jest.fn().mockReturnValue([]),
    fromResources: jest.fn().mockReturnValue([]),
  } as unknown as jest.Mocked<ResourceIdentifier>);

describe('ResourceRetriever', () => {
  let retriever: ResourceRetriever;
  let mockDataClient: jest.Mocked<SiemMigrationsDataResourcesClient>;
  let mockResourceIdentifier: jest.Mocked<ResourceIdentifier>;

  beforeEach(() => {
    mockDataClient = {
      searchBatches: jest.fn().mockReturnValue({ next: jest.fn(() => []) }),
    } as unknown as jest.Mocked<SiemMigrationsDataResourcesClient>;

    retriever = new TestResourceRetriever('mockMigrationId', mockDataClient);

    MockResourceIdentifier.mockImplementation(defaultResourceIdentifier);
    mockResourceIdentifier = new MockResourceIdentifier(
      migrationItem
    ) as jest.Mocked<ResourceIdentifier>;
  });

  it('throws an error if initialize is not called before getResources', async () => {
    await expect(retriever.getResources(migrationItem)).rejects.toThrow(
      'initialize must be called before calling getResources'
    );
  });

  it('returns an empty object if no matching resources are found', async () => {
    // Mock the resource identifier to return no resources
    mockResourceIdentifier.fromOriginal.mockReturnValue([]);
    await retriever.initialize(); // Pretend initialize has been called

    const result = await retriever.getResources(migrationItem);
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
    MockResourceIdentifier.mockImplementation(
      () =>
        ({
          ...defaultResourceIdentifier(),
          fromOriginal: jest.fn().mockReturnValue(mockResourcesIdentified),
        } as unknown as jest.Mocked<ResourceIdentifier>)
    );

    const result = await retriever.getResources(migrationItem);
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

    MockResourceIdentifier.mockImplementation(
      () =>
        ({
          ...defaultResourceIdentifier(),
          fromOriginal: jest.fn().mockReturnValue(mockResourcesIdentifiedFromRule),
          fromResources: jest.fn().mockReturnValue([]).mockReturnValueOnce(mockNestedResources),
        } as unknown as jest.Mocked<ResourceIdentifier>)
    );

    const result = await retriever.getResources(migrationItem);
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
