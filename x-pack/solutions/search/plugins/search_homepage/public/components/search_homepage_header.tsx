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
  EuiIcon,
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
            <EuiFlexGroup gutterSize="xl">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="checkInCircleFilled" color="primary" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {i18n.translate('xpack.searchHomepage.featureUpdateLabel', {
                      defaultMessage: 'Feature update',
                    })}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="checkInCircleFilled" color="primary" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {i18n.translate('xpack.searchHomepage.featureUpdateLabel', {
                      defaultMessage: 'Feature update',
                    })}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="checkInCircleFilled" color="primary" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {i18n.translate('xpack.searchHomepage.featureUpdateLabel', {
                      defaultMessage: 'Feature update',
                    })}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
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
