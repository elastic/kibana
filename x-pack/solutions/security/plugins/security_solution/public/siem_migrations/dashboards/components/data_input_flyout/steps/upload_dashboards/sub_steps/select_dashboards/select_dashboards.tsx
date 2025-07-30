/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';

import type { EuiSearchBarProps, EuiTableSelectionType, OnTimeChangeProps } from '@elastic/eui';
import {
  EuiInMemoryTable,
  type EuiBasicTableColumn,
  EuiButton,
  EuiSuperDatePicker,
  Query,
} from '@elastic/eui';
import type { ReactElement } from 'react-markdown';
import type { SplunkDashboardsResult } from '../../../../types';

interface SelectDashboardsSubStepProps {
  dashboards: SplunkDashboardsResult[];
  onSelectionChange?: (selectedItems: SplunkDashboardsResult[]) => void;
}

export const SelectDashboardsSubStep = ({
  dashboards,
  onSelectionChange: onSelectionChangeProp,
}: SelectDashboardsSubStepProps) => {
  const [tableItems, setTableItems] = useState<SplunkDashboardsResult[]>(dashboards);
  const [selectedItems, setSelectedItems] = useState<SplunkDashboardsResult[]>([]);

  const selectedAll = useRef<boolean>(false);

  const onSelectedItemsChange = useCallback(
    (newSelectedItems: SplunkDashboardsResult[]) => {
      setSelectedItems(newSelectedItems);
      onSelectionChangeProp?.(newSelectedItems);
    },
    [onSelectionChangeProp]
  );

  const selection: EuiTableSelectionType<SplunkDashboardsResult> = useMemo(
    () => ({
      onSelectionChange: (newItems: SplunkDashboardsResult[]) => {
        if (selectedAll.current) {
          selectedAll.current = false;
          return;
        }
        onSelectedItemsChange(newItems);
      },
      selected: selectedItems,
    }),
    [onSelectedItemsChange, selectedItems]
  );
  const columns = useMemo<Array<EuiBasicTableColumn<SplunkDashboardsResult>>>(
    () => [
      {
        field: 'eai:acl.owner',
        name: 'Owner',
        sortable: false,
        truncateText: true,
      },
      {
        field: 'updated',
        name: 'Last Updated',
        sortable: true,
        truncateText: false,
      },
      {
        field: 'eai:acl.app',
        name: 'App',
        sortable: false,
        truncateText: true,
      },
      {
        field: 'title',
        name: 'Title',
        sortable: true,
        truncateText: true,
      },
    ],
    []
  );

  const onSelectAll = useCallback(() => {
    selectedAll.current = true;
    onSelectedItemsChange(tableItems);
  }, [onSelectedItemsChange, tableItems]);

  const onTimeChange = useCallback(({ start, end }: OnTimeChangeProps) => {}, []);

  const toolsLeft = useMemo<ReactElement[]>(() => {
    return [
      <EuiButton key="select-all" onClick={onSelectAll}>
        {`Select All (${tableItems.length})`}
      </EuiButton>,
    ];
  }, [onSelectAll, tableItems.length]);

  const toolsRight = useMemo<ReactElement[]>(() => {
    return [
      <EuiSuperDatePicker showUpdateButton={false} isQuickSelectOnly onTimeChange={onTimeChange} />,
    ];
  }, [onTimeChange]);

  const search: EuiSearchBarProps = useMemo(() => {
    return {
      toolsLeft,
      toolsRight,
      box: {
        incremental: true,
      },
      filters: [
        {
          type: 'is',
          field: 'online',
          name: 'Online',
        },
      ],
      onChange: ({ query, error }) => {
        if (!error) {
          const results = Query.execute(query, dashboards);
          setTableItems(results);
          // clear selection
          setSelectedItems([]);
          return true;
        }
      },
    };
  }, [toolsLeft, toolsRight, dashboards]);

  const pagination = useMemo(
    () => ({
      initialPageSize: 10,
    }),
    []
  );

  return (
    <EuiInMemoryTable
      compressed
      columns={columns}
      items={tableItems}
      itemId="id"
      selection={selection}
      search={search}
      pagination={pagination}
      childrenBetween={<span>{`Selected: ${selectedItems.length} of ${tableItems.length}`}</span>}
    />
  );
};
