/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type { ApiEndpointId } from '../../../common/api_endpoints';
import type { ResolvedVendorEndpoint } from './endpoints_config';
import { VendorEndpointCard } from './vendor_endpoint_card';

interface Props {
  vendors: ResolvedVendorEndpoint[];
  encodedApiKeys: Partial<Record<ApiEndpointId, string>>;
  keyCreatedBeforeByEndpointId: Partial<Record<ApiEndpointId, boolean>>;
  creatingEndpointId?: ApiEndpointId;
  canCreateApiKey: boolean;
  isLoading: boolean;
  onCreateApiKey: (endpointId: ApiEndpointId) => void;
}

export const MoreEndpointsPopover = ({
  vendors,
  encodedApiKeys,
  keyCreatedBeforeByEndpointId,
  creatingEndpointId,
  canCreateApiKey,
  isLoading,
  onCreateApiKey,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const titleId = useGeneratedHtmlId({ prefix: 'otherEndpointsTitle' });

  if (vendors.length === 0) {
    return null;
  }

  const isCreatingVendorKey = vendors.some((vendor) => vendor.id === creatingEndpointId);
  const closePopover = () => {
    // Closing mid-request would hide the only place the new key is shown.
    if (!isCreatingVendorKey) {
      setIsPopoverOpen(false);
    }
  };

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem
        grow={false}
        aria-hidden="true"
        css={css`
          width: 1px;
          height: ${euiTheme.size.l};
          background-color: ${euiTheme.colors.lightShade};
        `}
      />
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiButtonEmpty
              color="text"
              iconType="apps"
              onClick={() => (isPopoverOpen ? closePopover() : setIsPopoverOpen(true))}
              aria-haspopup="dialog"
              aria-expanded={isPopoverOpen}
              data-test-subj="observabilityOnboardingMoreEndpointsButton"
            >
              {i18n.translate('xpack.observability_onboarding.apiEndpoints.moreButtonLabel', {
                defaultMessage: 'More',
              })}
              <EuiIcon
                type={isPopoverOpen ? 'arrowUp' : 'arrowDown'}
                size="s"
                css={css`
                  margin-left: ${euiTheme.size.xs};
                `}
              />
            </EuiButtonEmpty>
          }
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          anchorPosition="downLeft"
          panelPaddingSize="m"
          aria-labelledby={titleId}
          focusTrapProps={{ clickOutsideDisables: !isCreatingVendorKey }}
          panelProps={{
            onKeyDown: (event: React.KeyboardEvent) => {
              if (event.key === 'Escape') {
                closePopover();
              }
            },
          }}
        >
          <div
            css={css`
              width: min(420px, 80vw);
            `}
          >
            <EuiPopoverTitle id={titleId} paddingSize="s">
              {i18n.translate('xpack.observability_onboarding.apiEndpoints.otherEndpointsTitle', {
                defaultMessage: 'Other endpoints',
              })}
            </EuiPopoverTitle>
            <EuiFlexGroup direction="column" gutterSize="m">
              {vendors.map((vendor) => (
                <EuiFlexItem key={vendor.id}>
                  <VendorEndpointCard
                    vendor={vendor}
                    encodedApiKey={encodedApiKeys[vendor.id]}
                    isCreating={creatingEndpointId === vendor.id}
                    canCreate={canCreateApiKey}
                    wasKeyCreatedBefore={Boolean(keyCreatedBeforeByEndpointId[vendor.id])}
                    isLoading={isLoading}
                    isDisabled={
                      creatingEndpointId !== undefined && creatingEndpointId !== vendor.id
                    }
                    onCreateApiKey={() => onCreateApiKey(vendor.id)}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </div>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
