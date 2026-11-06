/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { Filter } from '@kbn/es-query';
import { createGroupFilter, getNullGroupFilter } from '@kbn/grouping/src/containers/query/helpers';
import type { EntityURLStateResult } from '../../entities_table/hooks/use_entity_url_state';
import { useEntityGrouping } from '../../entities_table/grouping/use_entity_grouping';
import { useResolvedValueGroups } from '../hooks/use_resolved_value_groups';
import { useEntityFilterOverrides } from '../hooks/use_entity_grid_data';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import type { RowsMode } from '../common';
import { EntitiesGroups } from './entities_groups';
import { EntitiesGrid } from './entities_grid';

/** The filters of the bucket each level opens. */
let mockBucketFilters: Filter[][] = [];
/** The `isFetching` each level passes to its group wrapper. */
const mockWrapperFetching: Array<boolean | undefined> = [];

jest.mock('@kbn/cloud-security-posture', () => ({
  GroupWrapper: ({
    renderChildComponent,
    groupingLevel = 0,
    isFetching,
  }: {
    isFetching?: boolean;
    renderChildComponent: (filters: Filter[]) => React.ReactNode;
    groupingLevel?: number;
    // The first level is 0, the nested ones count on from 2.
  }) => {
    mockWrapperFetching[groupingLevel] = isFetching;
    return <>{renderChildComponent(mockBucketFilters[Math.min(groupingLevel, 1)])}</>;
  },
}));
jest.mock('../../../../../common/hooks/use_error_toast', () => ({ useErrorToast: jest.fn() }));
jest.mock('./entities_grid', () => ({ EntitiesGrid: jest.fn(() => null) }));
jest.mock('../../entities_table/grouping/use_entity_grouping', () => ({
  useEntityGrouping: jest.fn(() => ({ groupData: {}, grouping: {}, isFetching: false })),
}));
jest.mock('../hooks/use_resolved_value_groups', () => ({
  useResolvedValueGroups: jest.fn(({ rowsMode, selectedGroup }) => ({
    isEnabled: rowsMode === 'resolved' && selectedGroup === 'asset.criticality',
    groupData: {},
    isFetching: false,
  })),
}));
jest.mock('../hooks/use_entity_grid_data', () => ({
  useEntityFilterOverrides: jest.fn(() => ({ data: { include: ['host:h1'], exclude: [] } })),
}));

const STATE = { pageIndex: 0, pageSize: 10 } as EntityURLStateResult;

const renderGroups = (rowsMode: RowsMode, groupsSelected: string[]) =>
  render(
    <EntitiesGroups
      state={STATE}
      groupsSelected={groupsSelected}
      groupSelectorComponent={<></>}
      timeRange="7d"
      watchlistNames={new Map()}
      rowsMode={rowsMode}
      searchExpression='KQL("""entity.name: web*""")'
      entityExpression='entity.EngineMetadata.Type IN ("host")'
      readAccess={{} as never}
    />
  );

const getLeafGridProps = () => jest.mocked(EntitiesGrid).mock.calls[0][0];

describe('EntitiesGroups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('matches the rows of a resolved bucket on the group values, through the entity filters', () => {
    mockBucketFilters = [createGroupFilter('entity.source', ['aws']) as Filter[]];
    renderGroups('resolved', ['entity.source']);

    expect(getLeafGridProps()).toMatchObject({
      searchExpression: 'KQL("""entity.name: web*""")',
      entityExpression:
        'entity.EngineMetadata.Type IN ("host") AND MV_CONTAINS(entity.source, "aws")',
    });
  });

  it('matches the rows of the "no value" bucket of a resolved group value', () => {
    mockBucketFilters = [getNullGroupFilter('entity.attributes.watchlists') as Filter[]];
    renderGroups('resolved', ['entity.attributes.watchlists']);

    expect(getLeafGridProps().entityExpression).toBe(
      'entity.EngineMetadata.Type IN ("host") AND entity.attributes.watchlists IS NULL'
    );
  });

  it('matches the rows of individual rows on their own values, through the search', () => {
    mockBucketFilters = [createGroupFilter('entity.source', ['aws']) as Filter[]];
    renderGroups('individual', ['entity.source']);

    expect(getLeafGridProps()).toMatchObject({
      searchExpression: 'KQL("""entity.name: web*""") AND `entity.source` : "aws"',
      entityExpression: 'entity.EngineMetadata.Type IN ("host")',
    });
  });

  it('reads the first level from the group values on resolved rows', () => {
    mockBucketFilters = [createGroupFilter('asset.criticality', ['high_impact']) as Filter[]];
    renderGroups('resolved', ['asset.criticality']);

    expect(useResolvedValueGroups).toHaveBeenCalledWith(
      expect.objectContaining({ selectedGroup: 'asset.criticality', rowsMode: 'resolved' })
    );
    // The DSL grouping doesn't read.
    expect(useEntityGrouping).toHaveBeenCalledWith(
      expect.objectContaining({ isQueryReady: false })
    );
  });

  describe('a nested level under a resolved group value', () => {
    beforeEach(() => {
      mockBucketFilters = [
        createGroupFilter('asset.criticality', ['extreme_impact']) as Filter[],
        createGroupFilter('entity.EngineMetadata.Type', ['host']) as Filter[],
      ];
      renderGroups('resolved', ['asset.criticality', 'entity.EngineMetadata.Type']);
    });

    it('keeps the entities whose group value is in the parent bucket', () => {
      expect(useEntityFilterOverrides).toHaveBeenCalledWith({
        rowsMode: 'resolved',
        entityExpression: 'asset.criticality IN ("extreme_impact")',
      });
      const nestedCall = jest
        .mocked(useEntityGrouping)
        .mock.calls.find(([{ selectedGroup }]) => selectedGroup === 'entity.EngineMetadata.Type');
      expect(nestedCall?.[0].groupFilters).toEqual([
        {
          meta: {},
          query: {
            bool: {
              filter: [
                {
                  bool: {
                    should: [
                      {
                        bool: {
                          filter: [
                            {
                              bool: {
                                should: [{ terms: { 'asset.criticality': ['extreme_impact'] } }],
                                minimum_should_match: 1,
                              },
                            },
                          ],
                        },
                      },
                      { terms: { 'entity.id': ['host:h1'] } },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        },
      ]);
    });

    it('matches the leaf rows on the parent group value too', () => {
      expect(getLeafGridProps().entityExpression).toBe(
        'entity.EngineMetadata.Type IN ("host") AND asset.criticality IN ("extreme_impact")'
      );
      expect(getLeafGridProps().searchExpression).toBe(
        'KQL("""entity.name: web*""") AND `entity.EngineMetadata.Type` : "host"'
      );
    });
  });

  describe('a nested level whose parent overrides fail or load', () => {
    const defaultImplementation = jest.mocked(useEntityFilterOverrides).getMockImplementation();

    afterEach(() => {
      jest.mocked(useEntityFilterOverrides).mockImplementation(defaultImplementation);
    });

    const renderNested = () => {
      mockBucketFilters = [
        createGroupFilter('asset.criticality', ['extreme_impact']) as Filter[],
        createGroupFilter('entity.EngineMetadata.Type', ['host']) as Filter[],
      ];
      renderGroups('resolved', ['asset.criticality', 'entity.EngineMetadata.Type']);
    };

    it('shows the error of the parent overrides', () => {
      const error = new Error('too many overrides');
      jest.mocked(useEntityFilterOverrides).mockReturnValue({ error, isFetching: false } as never);
      renderNested();

      expect(useErrorToast).toHaveBeenCalledWith(expect.any(String), error);
    });

    it('shows the loading state while the parent overrides load', () => {
      jest
        .mocked(useEntityFilterOverrides)
        .mockReturnValue({ data: undefined, isFetching: true } as never);
      renderNested();

      // The level after the first one (the first wraps the parent bucket).
      expect(mockWrapperFetching[2]).toBe(true);
    });
  });
});
