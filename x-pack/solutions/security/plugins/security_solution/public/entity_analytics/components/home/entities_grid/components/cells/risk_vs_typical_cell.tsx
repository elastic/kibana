/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiScreenReaderOnly, EuiText, EuiTextColor, EuiToolTip } from '@elastic/eui';
import { alignEndCss } from './styles';
import { useBaselineDataMode } from '../../../../../baseline_prototype/baseline_prototype_state';

const HIGHER_THAN_TYPICAL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.riskVsTypical.higher',
  { defaultMessage: 'Higher than typical by' }
);
const LOWER_THAN_TYPICAL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.riskVsTypical.lower',
  { defaultMessage: 'Lower than typical by' }
);
const TYPICAL_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.riskVsTypical.tooltip',
  {
    defaultMessage:
      'The current risk score minus the typical (median) score over the selected time range.',
  }
);
const MOCK_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.riskVsTypical.mockTooltip',
  { defaultMessage: 'Mock data. The typical score is made up for this prototype.' }
);

/**
 * DESIGN PROTOTYPE, NOT FOR MERGE.
 * How far the risk score is from its typical value over the selected range, with that value.
 */
export const RiskVsTypicalCell = memo(
  ({ value, typical }: { value: unknown; typical: number | undefined }) => {
    const dataMode = useBaselineDataMode();
    if (typeof value !== 'number') return <div css={alignEndCss}>{'—'}</div>;

    // Compare the displayed (rounded) value so a difference that shows as 0.00 isn't flagged.
    const delta = Number(value.toFixed(2));
    const worse = delta > 0;
    const typicalText = typical != null ? ` ${typical.toFixed(2)}` : '';
    const tooltip = dataMode === 'mock' ? `${TYPICAL_TOOLTIP} ${MOCK_TOOLTIP}` : TYPICAL_TOOLTIP;

    return (
      <EuiToolTip content={tooltip} anchorProps={{ css: alignEndCss }}>
        <EuiText size="s" tabIndex={0}>
          {delta === 0 ? (
            <EuiTextColor color="subdued">{'0.00 ='}</EuiTextColor>
          ) : (
            <EuiTextColor color={worse ? 'danger' : 'success'}>
              <EuiScreenReaderOnly>
                <span>{worse ? HIGHER_THAN_TYPICAL : LOWER_THAN_TYPICAL}</span>
              </EuiScreenReaderOnly>
              {` ${worse ? '+' : '-'}${Math.abs(delta).toFixed(2)} `}
              <span aria-hidden={true}>{worse ? '↑' : '↓'}</span>
            </EuiTextColor>
          )}
          <EuiTextColor color="subdued">
            {i18n.translate('xpack.securitySolution.entityAnalytics.home.riskVsTypical.typical', {
              defaultMessage: ' vs{typical}',
              values: { typical: typicalText },
            })}
            {dataMode === 'mock' ? ' *' : ''}
          </EuiTextColor>
        </EuiText>
      </EuiToolTip>
    );
  }
);
RiskVsTypicalCell.displayName = 'RiskVsTypicalCell';
