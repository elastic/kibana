/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleResourceRetriever } from './rule_resource_retriever'; // Adjust path as needed
import type { OriginalRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import { ResourceIdentifier } from '../../../../../../common/siem_migrations/rules/resources';
import type { RuleMigrationsDataClient } from '../../data/rule_migrations_data_client';

jest.mock('../../data/rule_migrations_data_service');
jest.mock('../../../../../../common/siem_migrations/rules/resources');

const MockResourceIdentifier = ResourceIdentifier as jest.Mock;

describe('RuleResourceRetriever', () => {
  let retriever: RuleResourceRetriever;
  let mockDataClient: jest.Mocked<RuleMigrationsDataClient>;
  let mockResourceIdentifier: jest.Mocked<ResourceIdentifier>;

  beforeEach(() => {
    mockDataClient = {
      resources: { searchBatches: jest.fn().mockReturnValue({ next: jest.fn(() => []) }) },
    } as unknown as RuleMigrationsDataClient;

    retriever = new RuleResourceRetriever('mockMigrationId', mockDataClient);

    MockResourceIdentifier.mockImplementation(() => ({
      fromOriginalRule: jest.fn().mockReturnValue([]),
      fromResources: jest.fn().mockReturnValue([]),
    }));
    mockResourceIdentifier = new MockResourceIdentifier(
      'splunk'
    ) as jest.Mocked<ResourceIdentifier>;
  });

  it('throws an error if initialize is not called before getResources', async () => {
    const originalRule = { vendor: 'splunk' } as unknown as OriginalRule;

    await expect(retriever.getResources(originalRule)).rejects.toThrow(
      'initialize must be called before calling getResources'
    );
  });

  it('returns an empty object if no matching resources are found', async () => {
    const originalRule = { vendor: 'splunk' } as unknown as OriginalRule;

    // Mock the resource identifier to return no resources
    mockResourceIdentifier.fromOriginalRule.mockReturnValue([]);
    await retriever.initialize(); // Pretend initialize has been called

    const result = await retriever.getResources(originalRule);
    expect(result).toEqual({});
  });

  it('returns matching macro and list resources', async () => {
    const mockExistingResources = {
      macro: { macro1: { name: 'macro1', type: 'macro' } },
      list: { list1: { name: 'list1', type: 'list' } },
    };
    // Inject existing resources manually
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (retriever as any).existingResources = mockExistingResources;

    const mockResourcesIdentified = [
      { name: 'macro1', type: 'macro' as const },
      { name: 'list1', type: 'list' as const },
    ];
    MockResourceIdentifier.mockImplementation(() => ({
      fromOriginalRule: jest.fn().mockReturnValue(mockResourcesIdentified),
      fromResources: jest.fn().mockReturnValue([]),
    }));

    const originalRule = { vendor: 'splunk' } as unknown as OriginalRule;

    const result = await retriever.getResources(originalRule);
    expect(result).toEqual({
      macro: [{ name: 'macro1', type: 'macro' }],
      list: [{ name: 'list1', type: 'list' }],
    });
  });

  it('handles nested resources properly', async () => {
    const originalRule = { vendor: 'splunk' } as unknown as OriginalRule;

    const mockExistingResources = {
      macro: {
        macro1: { name: 'macro1', type: 'macro' },
        macro2: { name: 'macro2', type: 'macro' },
      },
      list: {
        list1: { name: 'list1', type: 'list' },
        list2: { name: 'list2', type: 'list' },
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (retriever as any).existingResources = mockExistingResources;

    const mockResourcesIdentifiedFromRule = [
      { name: 'macro1', type: 'macro' as const },
      { name: 'list1', type: 'list' as const },
    ];

    const mockNestedResources = [
      { name: 'macro2', type: 'macro' as const },
      { name: 'list2', type: 'list' as const },
    ];

    MockResourceIdentifier.mockImplementation(() => ({
      fromOriginalRule: jest.fn().mockReturnValue(mockResourcesIdentifiedFromRule),
      fromResources: jest.fn().mockReturnValue([]).mockReturnValueOnce(mockNestedResources),
    }));

    const result = await retriever.getResources(originalRule);
    expect(result).toEqual({
      macro: [
        { name: 'macro1', type: 'macro' },
        { name: 'macro2', type: 'macro' },
      ],
      list: [
        { name: 'list1', type: 'list' },
        { name: 'list2', type: 'list' },
      ],
    });
  });
});
