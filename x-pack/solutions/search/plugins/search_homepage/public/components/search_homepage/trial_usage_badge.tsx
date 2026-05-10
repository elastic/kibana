/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';

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
import { useKibana } from '../../hooks/use_kibana';

const TRIAL_TOTAL_DAYS = 15;

function getProgressColor(value: number, max: number): 'primary' | 'warning' | 'danger' {
  const percent = (value / max) * 100;
  if (percent > 95) return 'danger';
  if (percent >= 80) return 'warning';
  return 'primary';
}

export const TrialUsageBadge: React.FC = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { euiTheme } = useEuiTheme();
  const {
    services: { cloud },
  } = useKibana();
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

  const trialDaysLeft = useMemo(() => {
    if (!cloud?.trialEndDate) return 0;
    const diff = cloud.trialEndDate.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [cloud?.trialEndDate]);
  const daysUsed = TRIAL_TOTAL_DAYS - trialDaysLeft;

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
      {i18n.translate('xpack.searchHomepage.trialUsageBadge.trialLabel', {
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
      aria-label={i18n.translate('xpack.searchHomepage.trialUsageBadge.popoverAriaLabel', {
        defaultMessage: 'Trial usage details',
      })}
      data-test-subj="trialUsagePopover"
    >
      <EuiPopoverTitle>
        <EuiTitle size="xxs">
          <h4>
            {i18n.translate('xpack.searchHomepage.trialUsageBadge.serverlessTitle', {
              defaultMessage: 'Elasticsearch Serverless',
            })}
          </h4>
        </EuiTitle>
      </EuiPopoverTitle>

      <EuiFlexGroup direction="column" gutterSize="none" css={css({ width: 330 })}>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xs" direction="column">
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs">
                      <strong>
                        {i18n.translate('xpack.searchHomepage.trialUsageBadge.trialPeriodLabel', {
                          defaultMessage: 'Trial period',
                        })}
                      </strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiIconTip
                      type="questionInCircle"
                      content={i18n.translate(
                        'xpack.searchHomepage.trialUsageBadge.trialPeriodTooltip',
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
                  {i18n.translate('xpack.searchHomepage.trialUsageBadge.daysLeft', {
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
              {i18n.translate('xpack.searchHomepage.trialUsageBadge.daysUsed', {
                defaultMessage: '{used} / {total} days',
                values: { used: daysUsed, total: TRIAL_TOTAL_DAYS },
              })}
            </EuiText>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiPopoverFooter>
          <EuiButton
            data-test-subj="trialUsageBadgeManageSubscriptionButton"
            href={billingUrl || undefined}
            target="_blank"
            fullWidth
            color="primary"
            iconType="popout"
            iconSide="right"
          >
            {i18n.translate('xpack.searchHomepage.trialUsageBadge.manageSubscription', {
              defaultMessage: 'Manage subscription',
            })}
          </EuiButton>
        </EuiPopoverFooter>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
