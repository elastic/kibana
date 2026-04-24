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
  EuiIconTip,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverTitle,
  EuiProgress,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface UsageMetric {
  value: number;
  displayValue?: string;
  unit: string;
  max: number;
}

interface TrialUsageBadgeProps {
  billingUrl?: string;
  searchUsage?: UsageMetric;
  modelUsage?: UsageMetric;
  isLoading?: boolean;
}

const DEFAULT_SEARCH_USAGE: UsageMetric = {
  value: 0,
  unit: 'VCU',
  max: 100,
};

const DEFAULT_MODEL_USAGE: UsageMetric = {
  value: 0,
  displayValue: '0',
  unit: 'Tokens',
  max: 50000,
};

export const TrialUsageBadge: React.FC<TrialUsageBadgeProps> = ({
  billingUrl,
  searchUsage,
  modelUsage,
  isLoading,
}) => {
  const search = searchUsage ?? DEFAULT_SEARCH_USAGE;
  const model = modelUsage ?? DEFAULT_MODEL_USAGE;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { euiTheme } = useEuiTheme();

  const button = (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      onClick={() => setIsPopoverOpen((prev) => !prev)}
      role="button"
      tabIndex={0}
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
          css={css({
            height: 'auto',
            minHeight: 0,
          })}
        >
          {i18n.translate('xpack.searchSharedUi.trialUsageBadge.viewUsage', {
            defaultMessage: 'View usage',
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
      panelPaddingSize="m"
      aria-label={i18n.translate('xpack.searchSharedUi.trialUsageBadge.popoverAriaLabel', {
        defaultMessage: 'Serverless usage',
      })}
      data-test-subj="trialUsagePopover"
    >
      <EuiPopoverTitle paddingSize="m" css={css({ border: 'none', paddingBottom: 0 })}>
        {i18n.translate('xpack.searchSharedUi.trialUsageBadge.popoverTitle', {
          defaultMessage: 'Serverless usage',
        })}
      </EuiPopoverTitle>
      <EuiFlexGroup direction="column" gutterSize="m" css={css({ width: 280 })}>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    {i18n.translate('xpack.searchSharedUi.trialUsageBadge.searchUsageLabel', {
                      defaultMessage: 'Search usage',
                    })}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    type="question"
                    content={i18n.translate(
                      'xpack.searchSharedUi.trialUsageBadge.searchUsageTooltip',
                      { defaultMessage: 'Elastic Compute Units consumed by search operations' }
                    )}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {isLoading ? (
                <EuiLoadingSpinner size="s" />
              ) : (
                <EuiText size="xs">
                  <strong>{search.displayValue ?? search.value}</strong>{' '}
                  <EuiText
                    size="xs"
                    component="span"
                    color="subdued"
                    css={css({ display: 'inline' })}
                  >
                    {search.unit}
                  </EuiText>
                </EuiText>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiProgress
            value={search.value}
            max={search.max}
            size="s"
            color="primary"
            css={css({ marginTop: euiTheme.size.xs })}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    {i18n.translate('xpack.searchSharedUi.trialUsageBadge.modelUsageLabel', {
                      defaultMessage: 'Model usage',
                    })}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    type="question"
                    content={i18n.translate(
                      'xpack.searchSharedUi.trialUsageBadge.modelUsageTooltip',
                      { defaultMessage: 'Tokens consumed by ML model inference' }
                    )}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {isLoading ? (
                <EuiLoadingSpinner size="s" />
              ) : (
                <EuiText size="xs">
                  <strong>{model.displayValue ?? model.value}</strong>{' '}
                  <EuiText
                    size="xs"
                    component="span"
                    color="subdued"
                    css={css({ display: 'inline' })}
                  >
                    {model.unit}
                  </EuiText>
                </EuiText>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiProgress
            value={model.value}
            max={model.max}
            size="s"
            color="success"
            css={css({ marginTop: euiTheme.size.xs })}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiButton
            data-test-subj="sharedUiTrialUsageBadgeViewSubscriptionPlansButton"
            href={billingUrl || undefined}
            fullWidth
            color="text"
          >
            {i18n.translate('xpack.searchSharedUi.trialUsageBadge.viewSubscriptionPlans', {
              defaultMessage: 'View subscription plans',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
