/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { promoBannerContainerStyle } from './styles';

export const PromoBanner = () => {
  const { euiTheme } = useEuiTheme();
  const [isCalloutDismissed, setIsCalloutDismissed] = useState(false);

  return (
    !isCalloutDismissed && (
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        css={promoBannerContainerStyle(euiTheme)}
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup responsive={false} alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h4>
                  <EuiTextColor color={euiTheme.colors.textPrimary}>
                    <FormattedMessage
                      id="xpack.searchHomepage.searchHomepagePage.promoBanner.promoTitle"
                      defaultMessage="Search Labs:"
                    />
                  </EuiTextColor>
                </h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="m">
                <p>
                  {i18n.translate('xpack.searchHomepage.promoBanner.promoText', {
                    defaultMessage:
                      "Transforming data interaction: Deploying Elastic's MCP server on Amazon Bedrock AgentCore Runtime for crafting agentic AI applications",
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            data-test-subj="searchHomepagePromoBannerDismissButton"
            iconType="cross"
            aria-label={i18n.translate(
              'xpack.searchHomepage.promoBanner.euiButtonIcon.dismissPromotionBannerLabel',
              { defaultMessage: 'Dismiss promotion banner' }
            )}
            onClick={() => setIsCalloutDismissed(true)}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    )
  );
};
