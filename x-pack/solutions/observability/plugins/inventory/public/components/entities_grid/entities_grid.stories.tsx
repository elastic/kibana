/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridSorting } from '@elastic/eui';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Meta, StoryFn } from '@storybook/react';
import { orderBy } from 'lodash';
import React, { useMemo, useState } from 'react';
import { ENTITY_LAST_SEEN } from '@kbn/observability-shared-plugin/common';
import { useArgs } from '@storybook/manager-api';
import { EntitiesGrid } from '.';
import { entitiesMock } from './mock/entities_mock';

interface EntityGridStoriesArgs {
  entityType?: string;
}

const entityTypeOptions = ['host', 'container', 'service'];

export const Grid: StoryFn<EntityGridStoriesArgs> = (args) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [{ entityType }, updateArgs] = useArgs();
  const [sort, setSort] = useState<EuiDataGridSorting['columns'][0]>({
    id: ENTITY_LAST_SEEN,
    direction: 'desc',
  });
  const filteredAndSortedItems = useMemo(
    () =>
      orderBy(
        entityType ? entitiesMock.filter((mock) => mock.entityType === entityType) : entitiesMock,
        sort.id,
        sort.direction
      ),
    [entityType, sort.direction, sort.id]
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" alignItems="flexStart">
          <EuiFlexItem grow={false}>{`Entity filter: ${entityType || 'N/A'}`}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              disabled={!entityType}
              data-test-subj="inventoryExampleClearFilterButton"
              onClick={() => updateArgs({ entityType: undefined })}
            >
              Clear filter
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EntitiesGrid
          entities={filteredAndSortedItems}
          loading={false}
          sortDirection={sort.direction}
          sortField={sort.id}
          onChangePage={setPageIndex}
          onChangeSort={setSort}
          pageIndex={pageIndex}
          onFilterByType={() => {}}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const EmptyGridExample: StoryFn<EntityGridStoriesArgs> = () => {
  const [pageIndex, setPageIndex] = useState(0);
  const [sort, setSort] = useState<EuiDataGridSorting['columns'][0]>({
    id: ENTITY_LAST_SEEN,
    direction: 'desc',
  });

  return (
    <EntitiesGrid
      entities={[]}
      loading={false}
      sortDirection={sort.direction}
      sortField={sort.id}
      onChangePage={setPageIndex}
      onChangeSort={setSort}
      pageIndex={pageIndex}
      onFilterByType={() => {}}
    />
  );
};

const stories: Meta<EntityGridStoriesArgs> = {
  title: 'app/inventory/entities_grid',
  component: Grid,
  argTypes: {
    entityType: {
      options: entityTypeOptions,
      name: 'Entity type',
      control: {
        type: 'select',
      },
    },
  },
  args: { entityType: undefined },
};

export default stories;
