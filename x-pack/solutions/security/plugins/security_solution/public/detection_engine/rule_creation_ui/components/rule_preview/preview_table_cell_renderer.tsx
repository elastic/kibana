/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { TableId } from '@kbn/securitysolution-data-table';
import type { Alert } from '@kbn/alerting-types';
import { PageScope } from '../../../../data_view_manager/constants';
import type { CellValueElementProps } from '../../../../../common/types';
import { CellValue } from '../../../../detections/configurations/security_solution_detections';

const emptyUserProfiles = { profiles: [], isLoading: false };

export const PreviewRenderCellValue: React.FC<
  EuiDataGridCellValueElementProps & CellValueElementProps
> = ({
  data,
  ecsData,
  setCellProps,
  isExpandable,
  isExpanded,
  isDetails,
  rowIndex,
  colIndex,
  columnId,
  rowRenderers,
  truncate,
}) => {
  const alert = useMemo<Alert>(() => {
    const result = (data ?? []).reduce<Record<string, unknown>>((acc, { field, value }) => {
      if (field === '_id' || field === '_index') {
        acc[field] = (value as string[])?.[0] ?? '';
      } else {
        acc[field] = value;
      }
      return acc;
    }, {});
    // Fallback _id/_index from ecsData if not in data
    if (!result._id && ecsData?._id) result._id = ecsData._id;
    if (!result._index && ecsData?._index) result._index = ecsData._index;
    return result as Alert;
  }, [data, ecsData]);

  return (
    <CellValue
      tableType={TableId.rulePreview}
      pageScope={PageScope.alerts}
      alert={alert}
      asPlainText={true}
      setCellProps={setCellProps}
      isExpandable={isExpandable}
      isExpanded={isExpanded}
      isDetails={isDetails}
      rowIndex={rowIndex}
      colIndex={colIndex}
      columnId={columnId}
      rowRenderers={rowRenderers}
      truncate={truncate}
      userProfiles={emptyUserProfiles}
    />
  );
};
