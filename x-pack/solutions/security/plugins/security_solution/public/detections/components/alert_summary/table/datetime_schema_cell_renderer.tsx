/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { Alert } from '@kbn/alerting-types';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { getAlertFieldValueAsStringOrNumberOrNull } from '../../../utils/type_utils';

export interface DatetimeSchemaCellRendererProps {
  /**
   * Alert data passed from the renderCellValue callback via the AlertWithLegacyFormats interface
   */
  alert: Alert;
  /**
   * Column id passed from the renderCellValue callback via EuiDataGridProps['renderCellValue'] interface
   */
  field: string;
}

/**
 * Renders the value of a field of type date (when the schema is 'datetime').
 * Component used in the AI for SOC alert summary table.
 */
export const DatetimeSchemaCellRenderer = memo(
  ({ alert, field }: DatetimeSchemaCellRendererProps) => {
    const displayValue: number | string | null = useMemo(
      () => getAlertFieldValueAsStringOrNumberOrNull(alert, field),
      [alert, field]
    );

    return <FormattedDate fieldName={field} value={displayValue} />;
  }
);

DatetimeSchemaCellRenderer.displayName = 'DatetimeSchemaCellRenderer';
