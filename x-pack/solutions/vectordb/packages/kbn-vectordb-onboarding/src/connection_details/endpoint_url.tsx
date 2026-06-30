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
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

interface EndpointUrlProps {
  elasticsearchUrl: string | null;
  isLoading: boolean;
  isCompact?: boolean;
}

const urlStyle = ({ euiTheme }: UseEuiTheme) => css`
  color: ${euiTheme.colors.textParagraph};
  font-weight: ${euiTheme.font.weight.regular};
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const flexItemStyle = css`
  min-width: 0;
`;

export const EndpointUrl = ({
  elasticsearchUrl,
  isLoading,
  isCompact = false,
}: EndpointUrlProps) => {
  if (isLoading) {
    return <EuiLoadingSpinner size="m" />;
  }

  return (
    <EuiPanel paddingSize={isCompact ? 'xs' : 's'} hasBorder>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem css={flexItemStyle}>
          <EuiCode transparentBackground css={urlStyle}>
            {elasticsearchUrl}
          </EuiCode>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiCopy textToCopy={elasticsearchUrl || ''}>
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
                  aria-label={i18n.translate('vectordbOnboarding.pathSelection.copyUrlAriaLabel', {
                    defaultMessage: 'Copy Elasticsearch URL',
                  })}
                  data-test-subj="vectordbConnectToProjectCopyUrl"
                  data-telemetry-id="vectordbOnboarding-connectToProject-copyUrl"
                />
              </EuiToolTip>
            )}
          </EuiCopy>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
