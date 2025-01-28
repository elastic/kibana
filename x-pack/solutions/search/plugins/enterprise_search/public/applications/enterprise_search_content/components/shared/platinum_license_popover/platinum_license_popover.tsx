/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { css } from '@emotion/react';

import {
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  EuiPopoverFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiPopoverProps,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { docLinks } from '../../../../shared/doc_links';
import { KibanaLogic } from '../../../../shared/kibana';

interface PlatinumLicensePopoverProps {
  button: EuiPopoverProps['button'];
  closePopover: () => void;
  isPopoverOpen: boolean;
}

export const PlatinumLicensePopover: React.FC<PlatinumLicensePopoverProps> = ({
  button,
  isPopoverOpen,
  closePopover,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <EuiPopoverTitle>
        {i18n.translate('xpack.enterpriseSearch.content.newIndex.selectConnector.upgradeTitle', {
          defaultMessage: 'Upgrade to Elastic Platinum',
        })}
      </EuiPopoverTitle>
      <EuiText
        grow={false}
        size="s"
        css={css`
          max-width: calc(${euiTheme.size.xl} * 10);
        `}
      >
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.content.newIndex.selectConnector.upgradeContent',
            {
              defaultMessage:
                'Self-managed connectors sending data to a self-managed Elasticsearch instance require at least a Platinum license.',
            }
          )}
        </p>
      </EuiText>
      <EuiPopoverFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="enterpriseSearchPlatinumLicensePopoverSubscriptionPlansButton"
              iconType="popout"
              target="_blank"
              href={docLinks.licenseManagement}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.newIndex.selectConnector.subscriptionButtonLabel',
                {
                  defaultMessage: 'Subscription plans',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="enterpriseSearchPlatinumLicensePopoverManageLicenseButton"
              iconType="wrench"
              iconSide="right"
              onClick={() =>
                KibanaLogic.values.navigateToUrl('/app/management/stack/license_management', {
                  shouldNotCreateHref: true,
                })
              }
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.newIndex.selectConnector.manageLicenseButtonLabel',
                {
                  defaultMessage: 'Manage license',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
