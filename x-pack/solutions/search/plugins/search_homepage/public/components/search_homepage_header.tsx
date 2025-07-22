/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiPageTemplate,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiImage,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAssetBasePath } from '../hooks/use_asset_base_path';

export const SearchHomepageHeader: React.FC = () => {
  const { euiTheme, colorMode } = useEuiTheme();
  const assetBasePath = useAssetBasePath();

  return (
    <EuiPageTemplate.Section
      data-test-subj="search-homepage-header"
      paddingSize="none"
      color="subdued"
    >
      <EuiFlexGroup
        gutterSize="m"
        alignItems="stretch"
        style={{
          paddingLeft: euiTheme.size.xxxl,
          paddingRight: euiTheme.size.xxxl,
        }}
      >
        <EuiFlexItem style={{ alignSelf: 'center' }}>
          <EuiPanel color="transparent" paddingSize="xl">
            <EuiTitle size="l">
              <h1>
                {i18n.translate('xpack.searchHomepage.pageTitle', {
                  defaultMessage: 'Your vector database just got faster',
                })}
              </h1>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText grow={false}>
              <p>
                {i18n.translate('xpack.searchHomepage.description', {
                  defaultMessage:
                    'Elasticsearch and Lucene now offer “Better binary quantization”, delivering ~95% memory reduction while maintaining high ranking quality.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="xl" />
            {/* To DO: Enable the following once we have text content ready
            <FeatureUpdateGroup updates={['Feature update', 'Feature update', 'Feature update']} /> */}
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiImage
            size="xl"
            src={
              colorMode === 'LIGHT'
                ? `${assetBasePath}/search_homepage_light.svg`
                : `${assetBasePath}/search_homepage_dark.svg`
            }
            alt=""
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageTemplate.Section>
  );
};
