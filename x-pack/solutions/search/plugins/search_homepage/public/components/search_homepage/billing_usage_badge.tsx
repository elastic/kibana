/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPopover,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';
import { useBillingUsage, useSaveBillingApiKey } from '../../hooks/api/use_billing_usage';

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

const EcuProgressBar = ({
  instanceEcu,
  totalEcu,
  label,
}: {
  instanceEcu: number;
  totalEcu: number;
  label: string;
}) => {
  const percent = totalEcu > 0 ? Math.round((instanceEcu / totalEcu) * 100) : 0;

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="none">
          <EuiFlexItem grow>
            <EuiText size="xs">{label}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <strong>
                {instanceEcu.toFixed(2)}
                <FormattedMessage
                  id="xpack.searchHomepage.ecuProgressBar.strong.ecuLabel"
                  defaultMessage="ECU"
                />
              </strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiProgress value={percent} max={100} color="primary" size="s" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const UsageDisplay = ({
  totalEcu,
  instances,
}: {
  totalEcu: number;
  instances: Array<{ id: string; name: string; type: string; totalEcu: number }>;
}) => {
  const activeInstances = instances.filter((inst) => inst.totalEcu > 0);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiText size="s">
          <strong data-test-subj="billingTotalEcu">
            {totalEcu.toFixed(2)}{' '}
            {i18n.translate('xpack.searchHomepage.usageDisplay.strong.ecuLabel', {
              defaultMessage: 'ECU',
            })}
          </strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.searchHomepage.billingUsage.currentPeriod', {
            defaultMessage: '{monthName} 1 - {day}, {year}',
            values: {
              monthName: new Date().toLocaleString('en', { month: 'long' }),
              day: new Date().getDate(),
              year: new Date().getFullYear(),
            },
          })}
        </EuiText>
      </EuiFlexItem>

      {activeInstances.length > 0 && (
        <>
          <EuiHorizontalRule margin="xs" />
          {activeInstances.map((inst) => (
            <EuiFlexItem key={inst.id}>
              <EcuProgressBar
                instanceEcu={inst.totalEcu}
                totalEcu={totalEcu}
                label={inst.name || inst.type}
              />
            </EuiFlexItem>
          ))}
        </>
      )}
    </EuiFlexGroup>
  );
};

export const BillingUsageBadge = () => {
  const {
    services: { cloud },
  } = useKibana();
  const { euiTheme } = useEuiTheme();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [billingUrl, setBillingUrl] = useState<string>();
  const { data: billingData, isLoading } = useBillingUsage();

  useEffect(() => {
    cloud?.getPrivilegedUrls().then((urls) => {
      if (urls.billingUrl) {
        setBillingUrl(urls.billingUrl);
      }
    });
  }, [cloud]);

  if (!billingUrl) {
    return null;
  }

  const baseUrl = cloud?.getUrls().baseUrl ?? '';
  const usageUrl = `${baseUrl}/billing/usage`;
  const budgetsUrl = `${baseUrl}/billing/budgets`;

  const badgeLabel =
    billingData?.configured && billingData.totalEcu !== undefined
      ? `${billingData.totalEcu.toFixed(2)} ECU`
      : i18n.translate('xpack.searchHomepage.billingUsage.badgeLabel', {
          defaultMessage: 'View usage',
        });

  const badge = (
    <EuiBadge
      css={css({
        borderRadius: euiTheme.size.l,
        padding: `0 ${euiTheme.size.m}`,
        cursor: 'pointer',
      })}
      color={billingData?.configured ? 'accent' : 'hollow'}
      onClick={() => setIsPopoverOpen((open) => !open)}
      onClickAriaLabel={i18n.translate('xpack.searchHomepage.billingUsage.badgeAriaLabel', {
        defaultMessage: 'View billing usage',
      })}
      data-test-subj="billingUsageBadge"
    >
      {badgeLabel}
    </EuiBadge>
  );

  return (
    <EuiPopover
      button={badge}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="m"
      data-test-subj="billingUsagePopover"
    >
      <EuiFlexGroup direction="column" gutterSize="m" css={css({ width: euiTheme.base * 22 })}>
        <EuiFlexItem>
          <EuiTitle size="xxxs">
            <h4>
              {i18n.translate('xpack.searchHomepage.billingUsage.popoverTitle', {
                defaultMessage: 'Cloud billing',
              })}
            </h4>
          </EuiTitle>
        </EuiFlexItem>

        {isLoading && (
          <EuiFlexItem>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
        )}

        {!isLoading && billingData?.configured && billingData.totalEcu !== undefined && (
          <EuiFlexItem>
            <UsageDisplay totalEcu={billingData.totalEcu} instances={billingData.instances ?? []} />
          </EuiFlexItem>
        )}

        {!isLoading && !billingData?.configured && (
          <EuiFlexItem>
            <ApiKeyForm onSaved={() => setIsPopoverOpen(false)} />
          </EuiFlexItem>
        )}

        <EuiHorizontalRule margin="xs" />

        <EuiFlexItem>
          <EuiButtonEmpty
            href={usageUrl}
            target="_blank"
            iconType="sortRight"
            iconSide="left"
            flush="both"
            size="s"
            data-test-subj="billingUsageGoToUsageLink"
          >
            {i18n.translate('xpack.searchHomepage.billingUsage.goToUsage', {
              defaultMessage: 'Go to usage',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButtonEmpty
            href={budgetsUrl}
            target="_blank"
            iconType="sortRight"
            iconSide="left"
            flush="both"
            size="s"
            data-test-subj="billingUsageBudgetsLink"
          >
            {i18n.translate('xpack.searchHomepage.billingUsage.budgetsAndNotifications', {
              defaultMessage: 'Budgets and notifications',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.searchHomepage.billingUsage.costsDisclaimer', {
              defaultMessage: 'Costs are updated within 24 hours.',
            })}
          </EuiText>
          <EuiSpacer size="xs" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
