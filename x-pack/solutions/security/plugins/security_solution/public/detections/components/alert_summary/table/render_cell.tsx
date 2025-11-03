/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ComponentProps, memo } from 'react';
import { ALERT_SEVERITY } from '@kbn/rule-data-utils';
import { RELATED_INTEGRATION } from '../../../constants';
import type { GetTableProp } from './types';
import { DatetimeSchemaCellRenderer } from './datetime_schema_cell_renderer';
import { BasicCellRenderer } from './basic_cell_renderer';
import { KibanaAlertSeverityCellRenderer } from './kibana_alert_severity_cell_renderer';
import { KibanaAlertRelatedIntegrationsCellRenderer } from './kibana_alert_related_integrations_cell_renderer';

const DATETIME_SCHEMA = 'datetime';

export type CellValueProps = Pick<
  ComponentProps<GetTableProp<'renderCellValue'>>,
  /**
   * Alert data passed from the renderCellValue callback via the AlertWithLegacyFormats interface
   */
  | 'alert'
  /**
   * Column id passed from the renderCellValue callback via EuiDataGridProps['renderCellValue'] interface
   */
  | 'columnId'
  /**
   * List of installed EASE integrations.
   * This comes from the additionalContext property on the table.
   */
  | 'packages'
  /**
   * Type of field used to drive how we render the value in the BasicCellRenderer.
   * This comes from EuiDataGrid.
   */
  | 'schema'
>;

/**
 * Component used in EASE alert summary table.
 * It renders some of the value with custom renderers for some specific columns:
 *  - kibana.alert.rule.parameters
 *  - kibana.alert.severity
 * It also renders some schema types specifically (this property come from EuiDataGrid):
 *  - datetime
 * Finally it renders the rest as basic strings.
 */
export const CellValue = memo(({ alert, columnId, packages, schema }: CellValueProps) => {
  let component;

  if (columnId === RELATED_INTEGRATION) {
    component = <KibanaAlertRelatedIntegrationsCellRenderer alert={alert} packages={packages} />;
  } else if (columnId === ALERT_SEVERITY) {
    component = <KibanaAlertSeverityCellRenderer alert={alert} />;
  } else if (schema === DATETIME_SCHEMA) {
    component = <DatetimeSchemaCellRenderer alert={alert} field={columnId} />;
  } else {
    component = <BasicCellRenderer alert={alert} field={columnId} />;
  }

  return <>{component}</>;
});

CellValue.displayName = 'CellValue';
