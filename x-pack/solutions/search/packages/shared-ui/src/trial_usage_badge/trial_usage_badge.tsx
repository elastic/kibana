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
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopoverFooter,
  EuiPopover,
  EuiPopoverTitle,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CloudHostedUsage } from './cloud_hosted_usage';
import { ServerlessUsage } from './serverless_usage';

interface TrialUsageBadgeProps {
  billingUrl?: string;
  isServerless?: boolean;
  trialDaysLeft?: number;
}

export const TrialUsageBadge: React.FC<TrialUsageBadgeProps> = ({
  billingUrl,
  isServerless = false,
  trialDaysLeft = 12,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { euiTheme } = useEuiTheme();

  const title = isServerless
    ? i18n.translate('xpack.searchSharedUi.trialUsageBadge.serverlessTitle', {
        defaultMessage: 'Elasticsearch Serverless',
      })
    : i18n.translate('xpack.searchSharedUi.trialUsageBadge.cloudHostedTitle', {
        defaultMessage: 'Elastic Cloud Hosted',
      });

  const daysLabel = i18n.translate('xpack.searchSharedUi.trialUsageBadge.daysLeft', {
    defaultMessage: '{days} days',
    values: { days: trialDaysLeft },
  });

  const button = (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      onClick={() => setIsPopoverOpen((prev) => !prev)}
      role="button"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsPopoverOpen((prev) => !prev);
        }
      }}
      css={css({
        height: 28,
        padding: `${euiTheme.size.xxs} ${euiTheme.size.s} ${euiTheme.size.xxs} ${euiTheme.size.xs}`,
        borderRadius: euiTheme.size.l,
        border: `1px solid ${euiTheme.colors.borderBasePrimary}`,
        backgroundColor: euiTheme.colors.backgroundBasePrimary,
        cursor: 'pointer',
      })}
      data-test-subj="trialUsageBadge"
    >
      <EuiFlexItem grow={false}>
        <EuiBadge
          color={euiTheme.colors.primary}
          css={css({
            borderRadius: euiTheme.size.l,
            padding: `0 ${euiTheme.size.s}`,
          })}
        >
          {i18n.translate('xpack.searchSharedUi.trialUsageBadge.trialLabel', {
            defaultMessage: 'TRIAL',
          })}
        </EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          data-test-subj="sharedUiTrialUsageBadgeViewUsageButton"
          size="xs"
          flush="both"
          color="primary"
          iconType="arrowDown"
          iconSide="right"
          css={css({
            height: 'auto',
            minHeight: 0,
          })}
        >
          {i18n.translate('xpack.searchSharedUi.trialUsageBadge.usageLabel', {
            defaultMessage: 'Usage',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="downLeft"
      aria-label={title}
      data-test-subj="trialUsagePopover"
    >
      <EuiPopoverTitle>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h4>{title}</h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="default">{daysLabel}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverTitle>
      <EuiFlexGroup direction="column" gutterSize="none" css={css({ width: 330 })}>
        <EuiFlexItem>
          <EuiFlexGroup direction="column">
            {isServerless ? <ServerlessUsage /> : <CloudHostedUsage />}
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiPopoverFooter>
          <EuiFlexItem>
            <EuiButton
              data-test-subj="sharedUiTrialUsageBadgeViewSubscriptionPlansButton"
              href={billingUrl || undefined}
              fullWidth
              color="text"
              iconType="popout"
              iconSide="right"
            >
              {i18n.translate('xpack.searchSharedUi.trialUsageBadge.viewSubscriptionPlans', {
                defaultMessage: 'View subscription plans',
              })}
            </EuiButton>
          </EuiFlexItem>

          <EuiFlexItem css={css({ textAlign: 'center', marginTop: euiTheme.size.s })}>
            <EuiButtonEmpty
              data-test-subj="sharedUiTrialUsageBadgeDocumentationButton"
              href="https://www.elastic.co/docs"
              target="_blank"
              size="xs"
              iconType="documents"
            >
              {i18n.translate('xpack.searchSharedUi.trialUsageBadge.documentation', {
                defaultMessage: 'Documentation',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiPopoverFooter>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
