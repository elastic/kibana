/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiProgress,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface TrialUsageBadgeProps {
  billingUrl?: string;
  trialDaysLeft?: number;
  trialTotalDays?: number;
}

function getProgressColor(value: number, max: number): 'primary' | 'warning' | 'danger' {
  const percent = (value / max) * 100;
  if (percent > 95) return 'danger';
  if (percent >= 80) return 'warning';
  return 'primary';
}

export const TrialUsageBadge: React.FC<TrialUsageBadgeProps> = ({
  billingUrl,
  trialDaysLeft,
  trialTotalDays,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { euiTheme } = useEuiTheme();

  const daysUsed =
    trialDaysLeft !== undefined && trialTotalDays !== undefined
      ? trialTotalDays - trialDaysLeft
      : undefined;

  const button = (
    <EuiBadge
      color={euiTheme.colors.primary}
      onClick={() => setIsPopoverOpen((prev) => !prev)}
      onClickAriaLabel="Toggle trial usage"
      iconType="arrowDown"
      iconSide="right"
      css={css({
        borderRadius: euiTheme.size.l,
        padding: `0 ${euiTheme.size.s}`,
        cursor: 'pointer',
      })}
      data-test-subj="trialUsageBadge"
    >
      {i18n.translate('xpack.searchSharedUI.trialUsageBadge.trialLabel', {
        defaultMessage: 'TRIAL',
      })}
    </EuiBadge>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="downLeft"
      data-test-subj="trialUsagePopover"
    >
      <EuiPopoverTitle>
        <EuiTitle size="xxs">
          <h4>
            {i18n.translate('xpack.searchSharedUI.trialUsageBadge.serverlessTitle', {
              defaultMessage: 'Elasticsearch Serverless',
            })}
          </h4>
        </EuiTitle>
      </EuiPopoverTitle>

      <EuiFlexGroup direction="column" gutterSize="none" css={css({ width: 330 })}>
        {daysUsed !== undefined && trialTotalDays !== undefined && trialDaysLeft !== undefined && (
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="xs" direction="column">
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="none">
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="xs">
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs">
                        <strong>
                          {i18n.translate('xpack.searchSharedUI.trialUsageBadge.trialPeriodLabel', {
                            defaultMessage: 'Trial period',
                          })}
                        </strong>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiIconTip
                        type="questionInCircle"
                        content={i18n.translate(
                          'xpack.searchSharedUI.trialUsageBadge.trialPeriodTooltip',
                          {
                            defaultMessage:
                              'Your free trial period. After it expires, you will need to subscribe to continue using the service.',
                          }
                        )}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    {i18n.translate('xpack.searchSharedUI.trialUsageBadge.daysLeft', {
                      defaultMessage: '{days} days left',
                      values: { days: trialDaysLeft },
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiProgress
                value={daysUsed}
                max={trialTotalDays}
                size="s"
                color={getProgressColor(daysUsed, trialTotalDays)}
              />

              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.searchSharedUI.trialUsageBadge.daysUsed', {
                  defaultMessage: '{used} / {total} days',
                  values: { used: daysUsed, total: trialTotalDays },
                })}
              </EuiText>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}

        <EuiPopoverFooter>
          <EuiButton
            data-test-subj="sharedUiTrialUsageBadgeManageSubscriptionButton"
            href={billingUrl || undefined}
            target="_blank"
            fullWidth
            color="primary"
            iconType="popout"
            iconSide="right"
          >
            {i18n.translate('xpack.searchSharedUI.trialUsageBadge.manageSubscription', {
              defaultMessage: 'Manage subscription',
            })}
          </EuiButton>
        </EuiPopoverFooter>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
