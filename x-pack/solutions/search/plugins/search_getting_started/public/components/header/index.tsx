/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiButtonEmpty,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';
import { useKibana } from '../../hooks/use_kibana';
import { PLUGIN_NAME } from '../../../common';
import { SearchGettingStartedSectionHeading } from '../section_heading';
import { AddDataButton } from './add_data_button';

export const SearchGettingStartedHeader: React.FC = () => {
  const assetBasePath = useAssetBasePath();
  const {
    services: { application },
  } = useKibana();

  const skipAndGoHomeLabel = i18n.translate('xpack.search.gettingStarted.page.headerCtaEmpty', {
    defaultMessage: 'Skip and go to Home',
  });

  return (
    <EuiFlexGroup gutterSize="m" alignItems="stretch" direction="rowReverse">
      <EuiFlexItem>
        <EuiImage size="xl" src={`${assetBasePath}/search_getting_started_header.svg`} alt="" />
      </EuiFlexItem>
      <EuiFlexItem style={{ alignSelf: 'center' }}>
        <EuiPanel color="transparent" paddingSize="none">
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
          <EuiFlexGroup gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <AddDataButton />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                aria-label={skipAndGoHomeLabel}
                data-test-subj="elasticLLMCostsTourCloseBtn"
                onClick={() => {
                  application.navigateToUrl('/app/elasticsearch/home');
                }}
                color="text"
              >
                {skipAndGoHomeLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
