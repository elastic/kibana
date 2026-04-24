/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiProgress,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';
import {
  useBillingUsage,
  useSaveBillingApiKey,
  type BillingBudget,
} from '../../hooks/api/use_billing_usage';

const getThresholdColor = (percent: number): 'success' | 'warning' | 'danger' => {
  if (percent >= 100) return 'danger';
  if (percent >= 75) return 'warning';
  return 'success';
};

const ApiKeyForm = ({ onSaved }: { onSaved: () => void }) => {
  const [apiKey, setApiKey] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const { mutate: saveApiKey, isLoading: isPending } = useSaveBillingApiKey();

  const handleSave = useCallback(() => {
    if (!apiKey || !organizationId) return;
    saveApiKey({ apiKey, organizationId }, { onSuccess: onSaved });
  }, [apiKey, organizationId, saveApiKey, onSaved]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.searchHomepage.billingUsage.apiKeyPrompt', {
            defaultMessage: 'Enter your Cloud API key to see ECU usage.',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.searchHomepage.billingUsage.orgIdLabel', {
            defaultMessage: 'Organization ID',
          })}
          fullWidth
        >
          <EuiFieldText
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            placeholder="1475229321"
            fullWidth
            data-test-subj="billingOrgIdInput"
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.searchHomepage.billingUsage.apiKeyLabel', {
            defaultMessage: 'Cloud API key',
          })}
          fullWidth
        >
          <EuiFieldText
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            type="password"
            fullWidth
            data-test-subj="billingApiKeyInput"
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton
          size="s"
          fill
          onClick={handleSave}
          isLoading={isPending}
          disabled={!apiKey || !organizationId}
          data-test-subj="billingApiKeySaveButton"
        >
          {i18n.translate('xpack.searchHomepage.billingUsage.saveButton', {
            defaultMessage: 'Save',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const BudgetProgressBar = ({
  currentEcu,
  budget,
}: {
  currentEcu: number;
  budget: BillingBudget;
}) => {
  const { euiTheme } = useEuiTheme();
  const percent = Math.round((currentEcu / budget.amount) * 100);
  const remaining = budget.amount - currentEcu;
  const color = getThresholdColor(percent);

  const thresholds = budget.alerts
    .filter((a) => a.thresholdType === 'percentage')
    .map((a) => a.threshold)
    .sort((a, b) => a - b);

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>
        <EuiFlexGroup alignItems="baseline" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText
              css={css({
                fontWeight: euiTheme.font.weight.bold,
                color:
                  color === 'danger'
                    ? euiTheme.colors.danger
                    : color === 'warning'
                    ? euiTheme.colors.warning
                    : undefined,
              })}
            >
              {percent}%
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="xs" color="subdued">
          {currentEcu.toFixed(0)} / {budget.amount.toFixed(0)}
          <FormattedMessage
            id="xpack.searchHomepage.budgetProgressBar.ecuTextLabel"
            defaultMessage="ECU"
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <div css={css({ position: 'relative' })}>
          <EuiProgress value={Math.min(percent, 100)} max={100} color={color} size="s" />
          {thresholds.map((t) => (
            <div
              key={t}
              css={css({
                position: 'absolute',
                left: `${t}%`,
                top: 0,
                bottom: 0,
                width: '2px',
                backgroundColor: euiTheme.colors.darkShade,
              })}
              title={`${t}%`}
            />
          ))}
        </div>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="xs" color={color === 'danger' ? 'danger' : 'subdued'}>
          {remaining >= 0
            ? i18n.translate('xpack.searchHomepage.billingUsage.ecuRemaining', {
                defaultMessage: '{remaining} ECU remaining',
                values: { remaining: remaining.toFixed(2) },
              })
            : i18n.translate('xpack.searchHomepage.billingUsage.ecuOver', {
                defaultMessage: '{over} ECU over budget',
                values: { over: Math.abs(remaining).toFixed(2) },
              })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const BillingUsagePanel = () => {
  const {
    services: { cloud },
  } = useKibana();
  const { euiTheme } = useEuiTheme();

  const { data: billingData, isLoading } = useBillingUsage();
  const [isDismissed, setIsDismissed] = useState(false);

  const baseUrl = cloud?.getUrls().baseUrl ?? '';
  const budgetsUrl = `${baseUrl}/billing/budgets`;

  const orgBudget = billingData?.budgets?.find((b) => b.scopeType === 'organization');

  if (isDismissed) {
    return null;
  }

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="billingUsagePanel">
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="none">
            <EuiFlexItem grow>
              <EuiText size="xs">
                <strong>
                  {i18n.translate('xpack.searchHomepage.billingUsage.panelTitle', {
                    defaultMessage: 'Billing and Usage',
                  })}
                </strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.searchHomepage.billingUsage.last30days', {
                  defaultMessage: 'Last 30 days',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {isLoading && (
          <EuiFlexItem>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
        )}

        {!isLoading && !billingData?.configured && (
          <EuiFlexItem>
            <ApiKeyForm onSaved={() => {}} />
          </EuiFlexItem>
        )}

        {!isLoading && billingData?.configured && billingData.totalEcu !== undefined && (
          <>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="xl" alignItems="flexStart">
                <EuiFlexItem>
                  <EuiFlexGroup gutterSize="xs" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs">
                        <strong>
                          {i18n.translate('xpack.searchHomepage.billingUsage.ecuUsageLabel', {
                            defaultMessage: 'ECU usage',
                          })}
                        </strong>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="iInCircle" size="s" color="subdued" aria-hidden={true} />
                    </EuiFlexItem>
                    {orgBudget && (
                      <>
                        <EuiFlexItem grow />
                        <EuiFlexItem grow={false}>
                          <EuiText
                            size="xs"
                            css={css({
                              fontWeight: euiTheme.font.weight.bold,
                              color:
                                getThresholdColor(
                                  Math.round((billingData.totalEcu / orgBudget.amount) * 100)
                                ) === 'danger'
                                  ? euiTheme.colors.danger
                                  : getThresholdColor(
                                      Math.round((billingData.totalEcu / orgBudget.amount) * 100)
                                    ) === 'warning'
                                  ? euiTheme.colors.warning
                                  : undefined,
                            })}
                          >
                            {Math.round((billingData.totalEcu / orgBudget.amount) * 100)}%
                          </EuiText>
                        </EuiFlexItem>
                      </>
                    )}
                  </EuiFlexGroup>
                  {orgBudget ? (
                    <BudgetProgressBar currentEcu={billingData.totalEcu} budget={orgBudget} />
                  ) : (
                    <>
                      <EuiText css={css({ fontWeight: euiTheme.font.weight.bold })}>
                        {billingData.totalEcu.toFixed(0)}{' '}
                        {i18n.translate('xpack.searchHomepage.billingUsagePanel.ecuTextLabel', {
                          defaultMessage: 'ECU',
                        })}
                      </EuiText>
                      <EuiText size="xs" color="subdued">
                        {i18n.translate('xpack.searchHomepage.billingUsage.noBudgetSet', {
                          defaultMessage: 'No budget set.',
                        })}
                      </EuiText>
                    </>
                  )}
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFlexGroup gutterSize="xs" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs">
                        <strong>
                          {i18n.translate('xpack.searchHomepage.billingUsage.modelUsageLabel', {
                            defaultMessage: 'Model usage',
                          })}
                        </strong>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="iInCircle" size="s" color="subdued" aria-hidden={true} />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiText css={css({ fontWeight: euiTheme.font.weight.bold })}>
                    {i18n.translate('xpack.searchHomepage.billingUsage.modelUsageValue', {
                      defaultMessage: '—',
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiHorizontalRule margin="xs" />

            <EuiFlexItem>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="none">
                <EuiFlexItem grow>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('xpack.searchHomepage.billingUsage.addBudgetPrompt', {
                      defaultMessage: 'Track your spending with budget alerts.',
                    })}
                    &nbsp;
                    <EuiButtonEmpty
                      href={budgetsUrl}
                      target="_blank"
                      flush="both"
                      size="xs"
                      iconType="popout"
                      iconSide="right"
                      data-test-subj="billingUsageBudgetsLink"
                    >
                      {orgBudget
                        ? i18n.translate('xpack.searchHomepage.billingUsage.manageBudget', {
                            defaultMessage: 'Manage budget',
                          })
                        : i18n.translate('xpack.searchHomepage.billingUsage.addBudget', {
                            defaultMessage: 'Add a budget',
                          })}
                    </EuiButtonEmpty>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="cross"
                    aria-label={i18n.translate(
                      'xpack.searchHomepage.billingUsage.dismissAriaLabel',
                      {
                        defaultMessage: 'Dismiss billing panel',
                      }
                    )}
                    size="xs"
                    color="text"
                    onClick={() => setIsDismissed(true)}
                    data-test-subj="billingUsageDismiss"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const BillingUsageBadge = BillingUsagePanel;
