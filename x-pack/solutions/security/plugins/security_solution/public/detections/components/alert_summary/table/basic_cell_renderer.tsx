/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { Alert } from '@kbn/alerting-types';
import { getOrEmptyTagFromValue } from '../../../../common/components/empty_value';
import { getAlertFieldValueAsStringOrNull } from '../../../utils/type_utils';

export interface BasicCellRendererProps {
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
 * Renders all the basic table cell values.
 * Component used in the AI for SOC alert summary table.
 */
export const BasicCellRenderer = memo(({ alert, field }: BasicCellRendererProps) => {
  const displayValue: string | null = useMemo(
    () => getAlertFieldValueAsStringOrNull(alert, field),
    [alert, field]
  );

  return <>{getOrEmptyTagFromValue(displayValue)}</>;
});

BasicCellRenderer.displayName = 'BasicCellRenderer';
