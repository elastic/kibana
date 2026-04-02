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
  useCurrentEuiBreakpoint,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { i18n } from '@kbn/i18n';
import { SEARCH_HOMEPAGE } from '@kbn/deeplinks-search';
import { KibanaVersionBadge } from '@kbn/search-shared-ui';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';
import { useKibana } from '../../hooks/use_kibana';
import { PLUGIN_NAME } from '../../../common';
import { docLinks } from '../../common/doc_links';
import { SearchGettingStartedSectionHeading } from '../section_heading';
import { AddDataButton } from './add_data_button';
import { ElasticsearchConnectionDetails } from '../elasticsearch_connection_details';

const skipAndGoHomeLabel = i18n.translate('xpack.search.gettingStarted.page.headerCtaEmpty', {
  defaultMessage: 'Skip and go to Home',
});

export const SearchGettingStartedHeader: React.FC = () => {
  const assetBasePath = useAssetBasePath();
  const currentBreakpoint = useCurrentEuiBreakpoint();
  const {
    services: { application, cloud, kibanaVersion },
  } = useKibana();
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup gutterSize={currentBreakpoint === 'xl' ? 'l' : 'xl'} direction="column">
      <EuiFlexGroup gutterSize="m" alignItems="stretch" direction="rowReverse">
        <EuiFlexItem>
          <EuiImage size="xl" src={`${assetBasePath}/search_getting_started_header.svg`} alt="" />
        </EuiFlexItem>
        <EuiFlexItem style={{ alignSelf: 'center' }}>
          <EuiPanel color="transparent" paddingSize="none">
            <SearchGettingStartedSectionHeading title={PLUGIN_NAME} icon="rocket" />
            <EuiSpacer size="s" />
            <EuiTitle size="l">
              <h1>
                {i18n.translate('xpack.search.gettingStarted.page.title', {
                  defaultMessage: 'Start building with Elasticsearch.',
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
              <EuiFlexItem
                grow={false}
                css={css`
                  border-right: ${euiTheme.border.thin};
                `}
              >
                <EuiButtonEmpty
                  aria-label={skipAndGoHomeLabel}
                  data-test-subj="skipAndGoHomeBtn"
                  onClick={() => {
                    application.navigateToApp(SEARCH_HOMEPAGE);
                  }}
                  color="text"
                >
                  {skipAndGoHomeLabel}
                </EuiButtonEmpty>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <KibanaVersionBadge
                  docLink={
                    cloud?.isServerlessEnabled
                      ? docLinks.serverlessReleaseNotes
                      : docLinks.hostedCloudReleaseNotes
                  }
                  kibanaVersion={
                    !cloud?.isServerlessEnabled
                      ? `v${kibanaVersion}`
                      : i18n.translate('xpack.search.gettingStarted.changelog', {
                          defaultMessage: 'Changelog',
                        })
                  }
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <ElasticsearchConnectionDetails />
    </EuiFlexGroup>
  );
};
