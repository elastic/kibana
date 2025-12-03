/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
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
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText size="m">
                <b>
                  {i18n.translate('xpack.searchHomepage.promoBanner.promoText', {
                    defaultMessage:
                      "Transforming data interaction: Deploying Elastic's MCP server on Amazon Bedrock AgentCore Runtime for crafting agentic AI applications",
                  })}
                </b>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink
                data-test-subj="searchHomepagePromoBannerReadTheArticleLink"
                external
                href="#"
              >
                <FormattedMessage
                  id="xpack.searchHomepage.promoBanner.readTheArticleLinkLabel"
                  defaultMessage="Read the article"
                />
              </EuiLink>
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
