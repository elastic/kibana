/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { TableId } from '@kbn/securitysolution-data-table';
import type { LegacyField } from '@kbn/alerting-types';
import type { CellValueElementProps } from '../../../../../common/types';
import { SourcererScopeName } from '../../../../sourcerer/store/model';
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
  const legacyAlert = useMemo(() => (data ?? []) as LegacyField[], [data]);
  return (
    <CellValue
      tableType={TableId.rulePreview}
      sourcererScope={SourcererScopeName.detections}
      legacyAlert={legacyAlert}
      ecsAlert={ecsData}
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
