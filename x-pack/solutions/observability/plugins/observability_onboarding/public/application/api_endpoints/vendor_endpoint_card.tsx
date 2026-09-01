/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { LogoIcon } from '../shared/logo_icon';
import { ApiKeyField } from './api_key_field';
import { EndpointField } from './endpoint_field';
import type { ResolvedVendorEndpoint } from './endpoints_config';

interface Props {
  vendor: ResolvedVendorEndpoint;
  encodedApiKey?: string;
  isCreating: boolean;
  canCreate: boolean;
  wasKeyCreatedBefore: boolean;
  isLoading: boolean;
  isDisabled?: boolean;
  onCreateApiKey: () => void;
}

export const VendorEndpointCard = ({
  vendor,
  encodedApiKey,
  isCreating,
  canCreate,
  wasKeyCreatedBefore,
  isLoading,
  isDisabled = false,
  onCreateApiKey,
}: Props) => {
  const { colorMode } = useEuiTheme();
  const logo = colorMode === 'DARK' ? vendor.darkLogo ?? vendor.logo : vendor.logo;

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      paddingSize="m"
      data-test-subj={`observabilityOnboardingVendorEndpointCard-${vendor.id}`}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <LogoIcon logo={logo} size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>{vendor.cardTitle}</h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EndpointField
        url={vendor.url}
        isLoading={isLoading}
        label={vendor.fieldLabel}
        dataTestSubjSuffix={`-${vendor.id}-popover`}
      />
      <EuiSpacer size="s" />
      <ApiKeyField
        encodedApiKey={encodedApiKey}
        isCreating={isCreating}
        canCreate={canCreate}
        wasKeyCreatedBefore={wasKeyCreatedBefore}
        onCreate={onCreateApiKey}
        dataTestSubjSuffix={`-${vendor.id}-popover`}
        ariaLabel={i18n.translate(
          'xpack.observability_onboarding.apiEndpoints.vendorApiKeyAriaLabel',
          { defaultMessage: '{vendor} API key', values: { vendor: vendor.cardTitle } }
        )}
        isDisabled={isDisabled}
        createdBeforePlaceholder={i18n.translate(
          'xpack.observability_onboarding.apiEndpoints.vendorApiKeyCreatedBeforePlaceholder',
          { defaultMessage: 'Cannot display existing keys' }
        )}
      />
    </EuiPanel>
  );
};
