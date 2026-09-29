/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import { RuleResourceRetriever } from './rule_resource_retriever'; // Adjust path as needed
import type { RuleMigrationsDataClient } from '../../data/rule_migrations_data_client';
import type { RuleMigrationRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import { RuleResourceIdentifier } from '../../../../../../common/siem_migrations/rules/resources';
import type { ExperimentalFeatures } from '../../../../../../common';

vi.mock('../../data/rule_migrations_data_service');
vi.mock('../../../../../../common/siem_migrations/rules/resources');

const MockResourceIdentifier = RuleResourceIdentifier as Mock;

const migration = { original_rule: { vendor: 'splunk' } } as unknown as RuleMigrationRule;

describe('RuleResourceRetriever', () => {
  let retriever: RuleResourceRetriever;
  let mockDataClient: Mocked<RuleMigrationsDataClient>;
  let mockResourceIdentifier: Mocked<RuleResourceIdentifier>;

  beforeEach(() => {
    mockDataClient = {
      resources: { searchBatches: vi.fn().mockReturnValue({ next: vi.fn(() => []) }) },
    } as unknown as Mocked<RuleMigrationsDataClient>;

    retriever = new RuleResourceRetriever('mockMigrationId', {
      resourcesDataClient: mockDataClient.resources,
      experimentalFeatures: {
        splunkV2DashboardsEnabled: false,
      } as unknown as ExperimentalFeatures,
    });

    MockResourceIdentifier.mockImplementation(() => ({
      fromOriginal: vi.fn().mockReturnValue([]),
      fromResources: vi.fn().mockReturnValue([]),
    }));
    mockResourceIdentifier = new MockResourceIdentifier('splunk') as Mocked<RuleResourceIdentifier>;
  });

  it('throws an error if initialize is not called before getResources', async () => {
    await expect(retriever.getResources(migration.original_rule)).rejects.toThrow(
      'initialize must be called before calling getResources'
    );
  });

  it('returns an empty object if no matching resources are found', async () => {
    // Mock the resource identifier to return no resources
    mockResourceIdentifier.fromOriginal.mockResolvedValue([]);
    await retriever.initialize(); // Pretend initialize has been called

    const result = await retriever.getResources(migration.original_rule);
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
    MockResourceIdentifier.mockImplementation(() => ({
      fromOriginal: vi.fn().mockReturnValue(mockResourcesIdentified),
      fromResources: vi.fn().mockReturnValue([]),
    }));

    const result = await retriever.getResources(migration.original_rule);
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

    MockResourceIdentifier.mockImplementation(() => ({
      fromOriginal: vi.fn().mockReturnValue(mockResourcesIdentifiedFromRule),
      fromResources: vi.fn().mockReturnValue([]).mockReturnValueOnce(mockNestedResources),
    }));

    const result = await retriever.getResources(migration.original_rule);
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
