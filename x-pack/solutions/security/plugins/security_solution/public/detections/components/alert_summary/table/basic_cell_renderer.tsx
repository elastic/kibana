/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { Alert } from '@kbn/alerting-types';
import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { getOrEmptyTagFromValue } from '../../../../common/components/empty_value';
import { TruncatableText } from '../../../../common/components/truncatable_text';
import { getAlertFieldValueAsStringOrNull } from '../../../utils/type_utils';

export const BASIC_CELL_RENDERER_TRUNCATE_TEST_ID =
  'alert-summary-table-basic-call-rendered-truncate';

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

  return (
    <TruncatableText dataTestSubj={BASIC_CELL_RENDERER_TRUNCATE_TEST_ID}>
      <EuiToolTip
        position="bottom"
        content={
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem grow={false}>
              <span>{field}</span>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <span>{displayValue}</span>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <span>{getOrEmptyTagFromValue(displayValue)}</span>
      </EuiToolTip>
    </TruncatableText>
  );
});

BasicCellRenderer.displayName = 'BasicCellRenderer';
