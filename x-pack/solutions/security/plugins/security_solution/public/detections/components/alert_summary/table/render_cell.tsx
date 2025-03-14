/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { Alert } from '@kbn/alerting-types';
import { KibanaAlertRelatedIntegrationCellRenderer } from '../cell_renderers/kibana_alert_related_integration';
import { RELATED_INTEGRATION, SEVERITY } from '../constants/fields';
import { KibanaAlertSeverityCellRenderer } from '../cell_renderers/kibana_alert_severity';

export interface TableProps {
  /**
   *
   */
  alert: Alert;
  /**
   *
   */
  columnId: string;
}

/**
 *
 */
export const CellValue = memo(({ alert, columnId }: TableProps) => {
  const value = alert[columnId];
  const displayValue = Array.isArray(value) ? value[0] : value;

  if (columnId === RELATED_INTEGRATION) {
    return <KibanaAlertRelatedIntegrationCellRenderer value={displayValue} />;
  }

  if (columnId === SEVERITY) {
    return <KibanaAlertSeverityCellRenderer value={displayValue} />;
  }

  return <>{displayValue}</>;
});

CellValue.displayName = 'CellValue';
