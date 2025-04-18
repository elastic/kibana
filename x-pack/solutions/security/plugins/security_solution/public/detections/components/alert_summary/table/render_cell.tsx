/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { Alert } from '@kbn/alerting-types';
import { ALERT_RULE_PARAMETERS, ALERT_SEVERITY } from '@kbn/rule-data-utils';
import { BasicCellRenderer } from './basic_cell_renderer';
import { KibanaAlertSeverityCellRenderer } from './kibana_alert_severity_cell_renderer';
import { KibanaAlertRelatedIntegrationsCellRenderer } from './kibana_alert_related_integrations_cell_renderer';

// guarantees that all cells will have their values vertically centered
const styles = { display: 'flex', alignItems: 'center', height: '100%' };

export interface CellValueProps {
  /**
   * Alert data passed from the renderCellValue callback via the AlertWithLegacyFormats interface
   */
  alert: Alert;
  /**
   * Column id passed from the renderCellValue callback via EuiDataGridProps['renderCellValue'] interface
   */
  columnId: string;
}

/**
 * Component used in the AI for SOC alert summary table.
 * It renders all the values currently as simply as possible (see code comments below).
 * It will be soon improved to support custom renders for specific fields (like kibana.alert.rule.parameters and kibana.alert.severity).
 */
export const CellValue = memo(({ alert, columnId }: CellValueProps) => {
  let component;

  switch (columnId) {
    case ALERT_RULE_PARAMETERS:
      component = <KibanaAlertRelatedIntegrationsCellRenderer alert={alert} />;
      break;

    case ALERT_SEVERITY:
      component = <KibanaAlertSeverityCellRenderer alert={alert} />;
      break;

    default:
      component = <BasicCellRenderer alert={alert} field={columnId} />;
      break;
  }

  return <div style={styles}>{component}</div>;
});

CellValue.displayName = 'CellValue';
