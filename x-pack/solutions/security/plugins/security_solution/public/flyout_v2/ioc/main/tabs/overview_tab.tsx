/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FlyoutError } from '../../../shared/components/flyout_error';
import { unwrapValue } from '../../../../threat_intelligence/modules/indicators/utils/unwrap_value';
import { RawIndicatorFieldId } from '../../../../../common/threat_intelligence/types/indicator';
import type { CellActionRenderer } from '../../../shared/components/cell_actions';
import { HighlightedValuesTable } from '../components/highlighted_values_table';
import type { Indicator } from '../../../../../common/threat_intelligence/types/indicator';

export const INDICATORS_FLYOUT_OVERVIEW_TABLE = 'tiFlyoutOverviewTableRow';

export interface OverviewTabProps {
  /**
   * The indicator document
   */
  indicator: Indicator;
  /**
   * Callback to navigate to the table tab, if not provided, hide the button
   */
  onViewAllFieldsInTable?: () => void;
  /**
   * Renderer for cell actions
   */
  renderCellActions: CellActionRenderer;
}

/**
 * Overview view displayed in the ioc details flyout
 */
export const OverviewTab = memo(
  ({ indicator, onViewAllFieldsInTable, renderCellActions }: OverviewTabProps) => {
    const indicatorType = unwrapValue(indicator, RawIndicatorFieldId.Type);

    if (!indicatorType) {
      return <FlyoutError />;
    }

    return (
      <>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h5>
                <FormattedMessage
                  id="xpack.securitySolution.threatIntelligence.indicator.flyoutOverviewTable.highlightedFields"
                  defaultMessage="Highlighted fields"
                />
              </h5>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {onViewAllFieldsInTable && (
              <EuiButtonEmpty onClick={onViewAllFieldsInTable}>
                <FormattedMessage
                  id="xpack.securitySolution.threatIntelligence.indicator.flyoutOverviewTable.viewAllFieldsInTable"
                  defaultMessage="View all fields in table"
                />
              </EuiButtonEmpty>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>

        <HighlightedValuesTable
          indicator={indicator}
          data-test-subj={INDICATORS_FLYOUT_OVERVIEW_TABLE}
          renderCellActions={renderCellActions}
        />
      </>
    );
  }
);

OverviewTab.displayName = 'OverviewTab';
