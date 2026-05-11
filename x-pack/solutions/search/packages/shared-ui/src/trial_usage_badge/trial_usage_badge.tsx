/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

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
import type { CloudStart } from '@kbn/cloud-plugin/public';

const TRIAL_TOTAL_DAYS = 15;

function getProgressColor(value: number, max: number): 'primary' | 'warning' | 'danger' {
  const percent = (value / max) * 100;
  if (percent > 95) return 'danger';
  if (percent >= 80) return 'warning';
  return 'primary';
}

interface TrialUsageBadgeProps {
  cloud?: CloudStart;
}

export const TrialUsageBadge: React.FC<TrialUsageBadgeProps> = ({ cloud }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { euiTheme } = useEuiTheme();

  const [billingUrl, setBillingUrl] = useState<string>('');
  useEffect(() => {
    cloud
      ?.getPrivilegedUrls()
      .then((urls) => {
        if (urls.billingUrl) {
          setBillingUrl(urls.billingUrl);
        }
      })
      .catch(() => {});
  }, [cloud]);

  const trialDaysLeft = cloud?.trialDaysLeft() ?? 0;
  const daysUsed = TRIAL_TOTAL_DAYS - trialDaysLeft;
  const hasPopoverContent = trialDaysLeft > 0 || billingUrl;

  const badge = (
    <EuiBadge
      color={euiTheme.colors.primary}
      {...(hasPopoverContent
        ? {
            onClick: () => setIsPopoverOpen((prev) => !prev),
            onClickAriaLabel: i18n.translate(
              'xpack.searchSharedUI.trialUsageBadge.toggleAriaLabel',
              { defaultMessage: 'Toggle trial usage details' }
            ),
            iconType: 'arrowDown',
            iconSide: 'right' as const,
          }
        : {})}
      data-test-subj="trialUsageBadge"
    >
      {i18n.translate('xpack.searchSharedUI.trialUsageBadge.trialLabel', {
        defaultMessage: 'TRIAL',
      })}
    </EuiBadge>
  );

  if (!hasPopoverContent) {
    return badge;
  }

  return (
    <EuiPopover
      button={badge}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="downLeft"
      aria-label={i18n.translate('xpack.searchSharedUI.trialUsageBadge.popoverAriaLabel', {
        defaultMessage: 'Trial usage details',
      })}
      data-test-subj="trialUsagePopover"
    >
      <EuiPopoverTitle
        css={
          trialDaysLeft <= 0
            ? css`
                margin-block-end: 0;
              `
            : undefined
        }
      >
        <EuiTitle size="xxs">
          <h4>
            {cloud?.isServerlessEnabled
              ? i18n.translate('xpack.searchSharedUI.trialUsageBadge.serverlessTitle', {
                  defaultMessage: 'Elasticsearch Serverless',
                })
              : i18n.translate('xpack.searchSharedUI.trialUsageBadge.cloudHostedTitle', {
                  defaultMessage: 'Elastic Cloud Hosted',
                })}
          </h4>
        </EuiTitle>
      </EuiPopoverTitle>

      {trialDaysLeft > 0 && (
        <EuiFlexGroup direction="column" gutterSize="none" css={css({ width: 330 })}>
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
                        type="info"
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
                max={TRIAL_TOTAL_DAYS}
                size="s"
                color={getProgressColor(daysUsed, TRIAL_TOTAL_DAYS)}
              />

              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.searchSharedUI.trialUsageBadge.daysUsed', {
                  defaultMessage: '{used} / {total} days',
                  values: { used: daysUsed, total: TRIAL_TOTAL_DAYS },
                })}
              </EuiText>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      {billingUrl && (
        <EuiPopoverFooter
          css={
            trialDaysLeft <= 0
              ? css`
                  margin-block-start: 0;
                  border-top: none;
                `
              : undefined
          }
        >
          <EuiButton
            data-test-subj="trialUsageBadgeManageSubscriptionButton"
            href={billingUrl}
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
      )}
    </EuiPopover>
  );
};
