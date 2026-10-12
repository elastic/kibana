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
import { i18n } from '@kbn/i18n';
import { getDailyUsageTone } from '../../utils/daily_usage';
import { listLabels } from '../translations';

export const AutomationUsageCell = ({
  used,
  limit,
  isRateLimited,
}: {
  used?: number;
  limit?: number;
  isRateLimited: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  if (limit === undefined || used === undefined) return <>—</>;

  const isLimitReached = used >= limit;
  const isLimitHigh = getDailyUsageTone(used, limit) !== 'healthy';
  const limitColor = euiTheme.colors.vis.euiColorVisWarning0;
  return (
    <div css={{ width: '100%' }}>
      <EuiToolTip
        display="block"
        content={
          isLimitReached
            ? i18n.translate('xpack.nightshift.automations.usageCellLimitReachedTooltip', {
                defaultMessage: 'Daily limit reached · no more runs until midnight (UTC)',
              })
            : i18n.translate('xpack.nightshift.automations.usageCellTooltip', {
                defaultMessage: '{used} of {limit} triggers used today · resets at midnight (UTC)',
                values: { used, limit },
              })
        }
      >
        <div data-test-subj="automationUsage" tabIndex={0}>
          <EuiFlexGroup
            justifyContent="flexEnd"
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
                  color={limitColor}
                  aria-label={listLabels.limitReached}
                  data-test-subj="automationLimitReached"
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiText
                size="xs"
                color={isLimitHigh ? limitColor : undefined}
                css={{
                  fontWeight: euiTheme.font.weight.semiBold,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {used} / {limit}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiProgress
            value={Math.min(used, limit)}
            max={limit}
            size="s"
            color={isLimitHigh ? limitColor : 'success'}
          />
        </div>
      </EuiToolTip>
    </div>
  );
};
