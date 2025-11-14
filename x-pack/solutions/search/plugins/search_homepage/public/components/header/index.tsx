/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiPageTemplate, EuiFlexGroup, EuiFlexItem, useEuiTheme, EuiImage } from '@elastic/eui';

import { useAssetBasePath } from '../../hooks/use_asset_base_path';
import { useKibana } from '../../hooks/use_kibana';
import { StatefulHeaderPromo } from './stateful_promo';
import { StatelessHeaderPromo } from './stateless_promo';

export const SearchHomepageHeader: React.FC = () => {
  const { euiTheme, colorMode } = useEuiTheme();
  const assetBasePath = useAssetBasePath();
  const { cloud } = useKibana().services;

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
          paddingLeft: euiTheme.size.xxl,
          paddingRight: euiTheme.size.xxl,
        }}
      >
        <EuiFlexItem style={{ alignSelf: 'center' }}>
          {cloud?.isServerlessEnabled ? <StatelessHeaderPromo /> : <StatefulHeaderPromo />}
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
