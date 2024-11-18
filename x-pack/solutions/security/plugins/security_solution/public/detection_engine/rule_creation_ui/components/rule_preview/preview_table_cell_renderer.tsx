/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { TableId } from '@kbn/securitysolution-data-table';
import type { CellValueElementProps } from '../../../../../common/types';
import { SourcererScopeName } from '../../../../sourcerer/store/model';
import { CellValue } from '../../../../detections/configurations/security_solution_detections';

export const PreviewRenderCellValue: React.FC<
  EuiDataGridCellValueElementProps & CellValueElementProps
> = (props) => {
  return (
    <CellValue
      {...(props as unknown as ComponentProps<typeof CellValue>)}
      asPlainText={true}
      scopeId={SourcererScopeName.detections}
      tableType={TableId.rulePreview}
    />
  );
};
