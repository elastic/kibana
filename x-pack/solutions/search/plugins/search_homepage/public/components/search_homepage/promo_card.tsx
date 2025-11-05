/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiImage,
  EuiTitle,
  EuiText,
  EuiButton,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';

export const PromoCard = () => {
  const assetBasePath = useAssetBasePath();
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder
      paddingSize="l"
      css={css({ backgroundColor: euiTheme.colors.backgroundBaseSubdued })}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <div css={css({ margin: `${euiTheme.size.xs} 0` })}>
            <EuiImage
              size={64}
              src={`${assetBasePath}/search_serverless_promo_logo.svg`}
              alt=""
              float="left"
            />
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h4>
              <FormattedMessage
                id="xpack.searchHomepage.searchHomepageBody.promoTitle"
                defaultMessage="Hands-free model management"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.searchHomepage.searchHomepageBody.promoDescription"
                defaultMessage="Leverage AI-powered search as a service without deploying a model in your environment."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="text"
            data-test-subj="searchHomepageSearchHomepageBodyEnableElasticInferenceServiceButton"
          >
            <FormattedMessage
              id="xpack.searchHomepage.searchHomepageBody.promoButtonLabel"
              defaultMessage="Enable Elastic Inference Service"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
