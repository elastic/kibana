/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProgress, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const AutomationUsageCell = ({ used, limit }: { used: number; limit?: number }) => {
  const { euiTheme } = useEuiTheme();
  if (limit === undefined) return <>—</>;

  const color = used >= limit ? 'danger' : 'success';
  return (
    <div css={{ width: '100%' }}>
      <EuiToolTip
        display="block"
        content={
          used >= limit
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
          <EuiProgress
            label={
              <EuiText
                size="xs"
                color={color === 'danger' ? 'danger' : undefined}
                css={{ marginBlockEnd: euiTheme.size.xs }}
              >
                {used} / {limit}
              </EuiText>
            }
            value={Math.min(used, limit)}
            max={limit}
            size="s"
            color={color}
          />
        </div>
      </EuiToolTip>
    </div>
  );
};
