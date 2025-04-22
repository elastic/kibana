/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { ALERT_SEVERITY } from '@kbn/rule-data-utils';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { upperFirst } from 'lodash/fp';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import { SEVERITY_VALUE_TEST_ID } from './test_ids';
import type { GetFieldsData } from '../../shared/hooks/use_get_fields_data';
import { CellActions } from '../../shared/components/cell_actions';
import { useRiskSeverityColors } from '../../../../common/utils/risk_color_palette';

const isSeverity = (x: unknown): x is Severity =>
  x === 'low' || x === 'medium' || x === 'high' || x === 'critical';

export interface DocumentSeverityProps {
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;
  /**
   * If true, show cell actions to allow users to filter, toggle column, copy to clipboard...
   * Default to false.
   */
  showCellActions?: boolean;
}

/**
 * Document details severity displayed in flyout right section header
 */
export const DocumentSeverity = memo(
  ({ getFieldsData, showCellActions = false }: DocumentSeverityProps) => {
    const { euiTheme } = useEuiTheme();

    const severityToColorMap = useRiskSeverityColors();

    const severity: Severity | null = useMemo(() => {
      const fieldsData = getFieldsData(ALERT_SEVERITY);

      if (typeof fieldsData === 'string' && isSeverity(fieldsData)) {
        return fieldsData;
      } else if (Array.isArray(fieldsData) && fieldsData.length > 0 && isSeverity(fieldsData[0])) {
        return fieldsData[0];
      } else {
        return null;
      }
    }, [getFieldsData]);

    const displayValue = useMemo(() => (severity && upperFirst(severity)) ?? null, [severity]);

    const color = useMemo(
      () => (severity && severityToColorMap[severity]) ?? euiTheme.colors.textSubdued,
      [severity, euiTheme.colors.textSubdued, severityToColorMap]
    );

    return (
      <>
        {severity && (
          <>
            {showCellActions ? (
              <CellActions field={ALERT_SEVERITY} value={severity}>
                <EuiBadge color={color} data-test-subj={SEVERITY_VALUE_TEST_ID}>
                  {displayValue}
                </EuiBadge>
              </CellActions>
            ) : (
              <EuiBadge color={color} data-test-subj={SEVERITY_VALUE_TEST_ID}>
                {displayValue}
              </EuiBadge>
            )}
          </>
        )}
      </>
    );
  }
);

DocumentSeverity.displayName = 'DocumentSeverity';
