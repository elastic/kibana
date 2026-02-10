/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type TdHTMLAttributes, useMemo } from 'react';
import {
  EuiAccordion,
  type EuiBasicTableColumn,
  EuiFlexGroup,
  EuiInMemoryTable,
  EuiPanel,
  EuiEmptyPrompt,
  EuiSpacer,
} from '@elastic/eui';

import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { i18n } from '@kbn/i18n';
import { useGroupedData } from '../../../hooks/use_grouped_data';
import { GroupByOptions, type FilterOptions } from '../../../types';
import { GroupPanelStyle } from './styles';
import { GroupByHeaderButton } from './group_header_button';
import { INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES } from '../types';

export interface GroupedEndpointsTablesProps {
  inferenceEndpoints: InferenceAPIConfigResponse[];
  groupBy: GroupByOptions;
  filterOptions: FilterOptions;
  searchKey: string;
  columns: EuiBasicTableColumn<InferenceAPIConfigResponse>[];
}

export const GroupedEndpointsTables = ({
  inferenceEndpoints,
  groupBy,
  filterOptions,
  searchKey,
  columns,
}: GroupedEndpointsTablesProps) => {
  const { data } = useGroupedData(inferenceEndpoints, groupBy, filterOptions, searchKey);
  const tableColumns = useMemo(() => {
    switch (groupBy) {
      case GroupByOptions.Model:
        return columns.filter(
          (c: TdHTMLAttributes<HTMLTableCellElement>) => c?.id !== 'model-column'
        );
      default:
        return columns;
    }
  }, [groupBy, columns]);

  if (inferenceEndpoints.length === 0 || Object.keys(data).length === 0) {
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
      {Object.entries(data).map(([groupId, groupedData]) => (
        <EuiPanel
          key={groupId}
          element="div"
          hasShadow={false}
          hasBorder
          paddingSize="none"
          css={GroupPanelStyle}
        >
          <EuiAccordion
            id={`${groupId}-group-accordion`}
            arrowProps={{
              size: 's',
            }}
            buttonProps={{
              paddingSize: 'm',
            }}
            buttonContent={<GroupByHeaderButton groupBy={groupBy} data={groupedData} />}
            data-test-subj={`${groupId}-accordion`}
            initialIsOpen
            paddingSize="none"
          >
            <EuiSpacer size="s" />
            <EuiInMemoryTable
              data-test-subj={`${groupId}-table`}
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
                    groupBy: groupBy,
                    groupId,
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
