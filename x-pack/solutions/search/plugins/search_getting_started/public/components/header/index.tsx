/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiText,
  useCurrentEuiBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ElasticsearchConnectionDetails } from '../elasticsearch_connection_details';
import { DeploymentStatusBadges } from './deployment_status_badges';

export const SearchGettingStartedHeader: React.FC = () => {
  const currentBreakpoint = useCurrentEuiBreakpoint();

  return (
    <EuiFlexGroup gutterSize={currentBreakpoint === 'xl' ? 'l' : 'xl'} direction="column">
      <EuiFlexGroup gutterSize="l" alignItems="flexStart" direction="column">
        <EuiFlexItem
          css={css({
            // ensures the trial badge and version badge fill parent with space between
            alignSelf: 'stretch',
          })}
        >
          <DeploymentStatusBadges />
        </EuiFlexItem>
<<<<<<< HEAD
        <EuiFlexItem>
          <EuiTitle size="l">
            <h1>
              {i18n.translate('xpack.searchGettingStarted.page.title', {
                defaultMessage: 'Get started with Elasticsearch.',
              })}
            </h1>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText grow={false} color="subdued" size="m">
            <p>
              {i18n.translate('xpack.searchGettingStarted.page.description', {
                defaultMessage:
                  'Connect your deployment and start building modern search for products, docs, chatbots, recommenders, and more.',
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <ElasticsearchConnectionDetails />
=======
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
                      : cloud?.isCloudEnabled
                      ? docLinks.hostedCloudReleaseNotes
                      : docLinks.releaseNotes
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
>>>>>>> 9.4
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
