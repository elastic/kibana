/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';

export const BillingUsageBadge = () => {
  const {
    services: { cloud },
  } = useKibana();
  const { euiTheme } = useEuiTheme();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [billingUrl, setBillingUrl] = useState<string>();

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

  const badge = (
    <EuiBadge
      css={css({
        borderRadius: euiTheme.size.l,
        padding: `0 ${euiTheme.size.m}`,
        cursor: 'pointer',
      })}
      color="hollow"
      onClick={() => setIsPopoverOpen((open) => !open)}
      onClickAriaLabel={i18n.translate('xpack.searchHomepage.billingUsage.badgeAriaLabel', {
        defaultMessage: 'View billing usage',
      })}
      data-test-subj="billingUsageBadge"
    >
      {i18n.translate('xpack.searchHomepage.billingUsage.badgeLabel', {
        defaultMessage: 'View usage',
      })}
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
      <EuiFlexGroup direction="column" gutterSize="m" css={css({ width: euiTheme.base * 18 })}>
        <EuiFlexItem>
          <EuiTitle size="xxxs">
            <h4>
              {i18n.translate('xpack.searchHomepage.billingUsage.popoverTitle', {
                defaultMessage: 'Cloud billing',
              })}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
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
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
