/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAccordion,
  type EuiBasicTableColumn,
  EuiFlexGroup,
  EuiInMemoryTable,
  EuiPanel,
  EuiEmptyPrompt,
  EuiSpacer,
  type EuiTableFieldDataColumnType,
  type EuiTableComputedColumnType,
} from '@elastic/eui';

import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { i18n } from '@kbn/i18n';
import { useGroupedData } from '../../../hooks/use_grouped_data';
import { GroupByOptions, type FilterOptions, type GroupByViewOptions } from '../../../types';
import { GroupPanelStyle } from './styles';
import { GroupByHeaderButton } from './group_header_button';
import { INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES } from '../types';
import { ServiceDescription } from './service_description';

export interface GroupedEndpointsTablesProps {
  inferenceEndpoints: InferenceAPIConfigResponse[];
  groupBy: GroupByViewOptions;
  filterOptions: FilterOptions;
  searchKey: string;
  columns: EuiBasicTableColumn<InferenceAPIConfigResponse>[];
}

function isColumnWithId(
  column: EuiBasicTableColumn<InferenceAPIConfigResponse>
): column is
  | EuiTableFieldDataColumnType<InferenceAPIConfigResponse>
  | EuiTableComputedColumnType<InferenceAPIConfigResponse> {
  return 'id' in column;
}

export const GroupedEndpointsTables = ({
  inferenceEndpoints,
  groupBy,
  filterOptions,
  searchKey,
  columns,
}: GroupedEndpointsTablesProps) => {
  const groupedEndpoints = useGroupedData(inferenceEndpoints, groupBy, filterOptions, searchKey);
  const tableColumns = useMemo(() => {
    switch (groupBy) {
      case GroupByOptions.Service:
        // remove service column when grouping by service
        return columns.filter((col) => (isColumnWithId(col) ? col?.id !== 'service-column' : true));
    }
    return columns;
  }, [columns, groupBy]);

  if (inferenceEndpoints.length === 0 || groupedEndpoints.length === 0) {
    // No data after filters / search key
    return (
      <EuiEmptyPrompt
        title={
          <h2>
            {i18n.translate('xpack.searchInferenceEndpoints.table.noItemsMessage', {
              defaultMessage: 'No items found',
            })}
          </h2>
        }
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="group-by-tables-container">
      {groupedEndpoints.map((groupedData) => (
        <EuiPanel
          key={groupedData.groupId}
          element="div"
          hasShadow={false}
          hasBorder
          paddingSize="none"
          css={GroupPanelStyle}
        >
          <EuiAccordion
            id={`${groupedData.groupId}-group-accordion`}
            arrowProps={{
              size: 's',
            }}
            buttonProps={{
              paddingSize: 'm',
            }}
            buttonContent={<GroupByHeaderButton data={groupedData} groupBy={groupBy} />}
            extraAction={
              groupBy === GroupByOptions.Service ? (
                <ServiceDescription service={groupedData.groupId} />
              ) : undefined
            }
            data-test-subj={`${groupedData.groupId}-accordion`}
            initialIsOpen
            paddingSize="none"
          >
            <EuiSpacer size="s" />
            <EuiInMemoryTable
              data-test-subj={`${groupedData.groupId}-table`}
              itemId="inference_id"
              items={groupedData.endpoints}
              columns={tableColumns}
              pagination={
                groupedData.endpoints.length > INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES[0]
                  ? {
                      pageSizeOptions: INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES,
                    }
                  : undefined
              }
              sorting={{
                sort: {
                  field: 'inference_id',
                  direction: 'asc',
                },
              }}
              tableCaption={i18n.translate(
                'xpack.searchInferenceEndpoints.groupedEndpoints.tableCaption',
                {
                  defaultMessage: 'Inference endpoints list grouped by {groupBy}: {groupId}',
                  values: {
                    groupBy,
                    groupId: groupedData.groupId,
                  },
                }
              )}
            />
          </EuiAccordion>
        </EuiPanel>
      ))}
    </EuiFlexGroup>
  );
};
