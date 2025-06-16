/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { ReactElement } from 'react';
import React from 'react';

import type { ColumnHeaderOptions, TimelineItem } from '@kbn/timelines-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { DefaultCellRenderer } from '../../cell_rendering/default_cell_renderer';

export const getFormattedFields = ({
  dataTableRows,
  headers,
  scopeId,
}: {
  dataTableRows: Array<DataTableRecord & TimelineItem>;
  headers: ColumnHeaderOptions[];
  scopeId: string;
}) => {
  return headers.reduce(
    (
      obj: Record<string, (props: EuiDataGridCellValueElementProps) => ReactElement>,
      header: ColumnHeaderOptions
    ) => {
      obj[header.id] = function UnifiedFieldRender(props: EuiDataGridCellValueElementProps) {
        return (
          <DefaultCellRenderer
            {...props}
            isTimeline={true}
            isDetails={false}
            isExpanded={false}
            isExpandable={true}
            data={dataTableRows[props.rowIndex].data}
            eventId={dataTableRows[props.rowIndex]._id}
            scopeId={scopeId}
            linkValues={undefined}
            header={header}
          />
        );
      };
      return obj;
    },
    {}
  );
};
