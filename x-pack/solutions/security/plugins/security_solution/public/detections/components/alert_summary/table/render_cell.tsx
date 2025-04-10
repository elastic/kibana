/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { Alert } from '@kbn/alerting-types';
import type { JsonValue } from '@kbn/utility-types';
import { getOrEmptyTagFromValue } from '../../../../common/components/empty_value';

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
  const displayValue: string | null = useMemo(() => {
    const cellValues: string | number | JsonValue[] = alert[columnId];

    // Displays string as is.
    // Joins values of array with more than one element.
    // Returns null if the value is null.
    // Return the string of the value otherwise.
    if (typeof cellValues === 'string') {
      return cellValues;
    } else if (Array.isArray(cellValues)) {
      if (cellValues.length > 1) {
        return cellValues.join(', ');
      } else {
        const value: JsonValue = cellValues[0];
        if (typeof value === 'string') {
          return value;
        } else if (value == null) {
          return null;
        } else {
          return value.toString();
        }
      }
    } else {
      return null;
    }
  }, [alert, columnId]);

  return <div style={styles}>{getOrEmptyTagFromValue(displayValue)}</div>;
});

CellValue.displayName = 'CellValue';
