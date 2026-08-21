/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiCode,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { flexItemStyle, typeSelectorStyle, urlStyle } from './endpoint_url.styles';

interface EndpointUrlProps {
  url: string | null;
  copyAriaLabel: string;
  isLoading: boolean;
  telemetryPage: string;
  typeSelector?: React.ReactNode;
}

export const EndpointUrl = ({
  url,
  copyAriaLabel,
  isLoading,
  telemetryPage,
  typeSelector,
}: EndpointUrlProps) => {
  if (isLoading) {
    return <EuiLoadingSpinner size="m" />;
  }

  return (
    <EuiPanel paddingSize="xs" hasBorder>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        {typeSelector && (
          <EuiFlexItem grow={false} css={typeSelectorStyle}>
            {typeSelector}
          </EuiFlexItem>
        )}
        <EuiFlexItem css={flexItemStyle}>
          <EuiCode transparentBackground css={urlStyle}>
            {url}
          </EuiCode>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiCopy textToCopy={url || ''}>
            {(copy) => (
              <EuiToolTip
                content={i18n.translate('vectordbOnboarding.pathSelection.copyUrl', {
                  defaultMessage: 'Copy',
                })}
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  iconType="copy"
                  onClick={copy}
                  aria-label={copyAriaLabel}
                  data-test-subj="vectordbConnectToProjectCopyUrl"
                  data-telemetry-id={`vectordbOnboarding-${telemetryPage}-copyEndpointUrl`}
                />
              </EuiToolTip>
            )}
          </EuiCopy>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
