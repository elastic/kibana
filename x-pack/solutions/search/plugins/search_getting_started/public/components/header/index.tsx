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
  EuiImage,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';
import { PLUGIN_NAME } from '../../../common';
import { SearchGettingStartedSectionHeading } from '../section_heading';

export const SearchGettingStartedHeader: React.FC = () => {
  const assetBasePath = useAssetBasePath();

  return (
    <EuiPageTemplate.Section data-test-subj="search-getting-started-header" paddingSize="none">
      <EuiFlexGroup gutterSize="m" alignItems="stretch">
        <EuiFlexItem style={{ alignSelf: 'center' }}>
          <EuiPanel color="transparent">
            <SearchGettingStartedSectionHeading title={PLUGIN_NAME} icon="launch" />
            <EuiSpacer size="s" />
            <EuiTitle size="l">
              <h1>
                {i18n.translate('xpack.search.gettingStarted.page.title', {
                  defaultMessage: 'Start your building with Elasticsearch.',
                })}
              </h1>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText grow={false}>
              <p>
                {i18n.translate('xpack.search.gettingStarted.page.description', {
                  defaultMessage:
                    'Dive into an API tutorial or connect your deployment to start building.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="l" />
            <EuiFlexGroup gutterSize="m" alignItems="stretch">
              <EuiFlexItem grow={false}>
                <EuiButton color="primary" fill={true} iconType="arrowDown" iconSide='right'>
                  {i18n.translate('xpack.search.gettingStarted.page.headerCTA', {
                    defaultMessage: 'Add data',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty data-test-subj="elasticLLMCostsTourCloseBtn" onClick={() => {}} color='text'>
                  {i18n.translate('xpack.search.gettingStarted.page.headerCtaEmpty', {
                    defaultMessage: 'Skip and go to Home',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiImage size="xl" src={`${assetBasePath}/search_getting_started_header.svg`} alt="" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageTemplate.Section>
  );
};
