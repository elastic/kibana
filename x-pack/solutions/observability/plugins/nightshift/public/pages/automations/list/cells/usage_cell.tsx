/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiProgress,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { getDailyUsageTone } from '../../utils/daily_usage';
import { getAutomationUsageTooltip } from '../../utils/usage_tooltip';
import { triggerLabels } from '../../flyouts/form/triggers/translations';
import { listLabels } from '../translations';

export const AutomationUsageCell = ({
  used,
  limit,
  isRateLimited,
  isGlobalLimitReached = false,
  align = 'end',
}: {
  used?: number;
  limit?: number;
  isRateLimited: boolean;
  /** When the shared investigation quota is exhausted, all usage meters use a disabled look. */
  isGlobalLimitReached?: boolean;
  align?: 'start' | 'end';
}) => {
  const { euiTheme } = useEuiTheme();
  if (used === undefined) return <>—</>;

  const isLimitHigh = limit !== undefined && getDailyUsageTone(used, limit) !== 'healthy';
  const warningText = euiTheme.colors.textWarning;
  const disabledText = euiTheme.colors.textDisabled;
  const limitColor = euiTheme.colors.vis.euiColorVisWarning0;
  const emphasisColor = isGlobalLimitReached ? disabledText : isLimitHigh ? warningText : undefined;
  const progressColor = isGlobalLimitReached ? disabledText : isLimitHigh ? limitColor : 'success';
  const tooltip = getAutomationUsageTooltip({ used, limit, isGlobalLimitReached });

  return (
    <div css={{ width: '100%' }}>
      <EuiToolTip display="block" title={tooltip.title} content={tooltip.content}>
        <div data-test-subj="automationUsage" tabIndex={0}>
          <EuiFlexGroup
            justifyContent={align === 'end' ? 'flexEnd' : 'flexStart'}
            alignItems="center"
            gutterSize="xs"
            responsive={false}
            css={{ marginBlockEnd: euiTheme.size.xs }}
          >
            {isRateLimited && (
              <EuiFlexItem grow={false}>
                <EuiIcon
                  type="hourglass"
                  size="s"
                  color={emphasisColor ?? warningText}
                  aria-label={listLabels.limitReached}
                  data-test-subj="automationLimitReached"
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiText
                size="xs"
                color={emphasisColor}
                css={{
                  fontWeight: euiTheme.font.weight.semiBold,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {used} / {limit ?? triggerLabels.noLimit}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          {limit !== undefined && (
            <EuiProgress value={Math.min(used, limit)} max={limit} size="s" color={progressColor} />
          )}
        </div>
      </EuiToolTip>
    </div>
  );
};
