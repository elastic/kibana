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
import { KibanaVersionBadge, TrialUsageBadge } from '@kbn/search-shared-ui';

import { docLinks } from '../../common/doc_links';
import { useKibana } from '../../hooks/use_kibana';
import { ElasticsearchConnectionDetails } from '../elasticsearch_connection_details';

export const SearchGettingStartedHeader: React.FC = () => {
  const currentBreakpoint = useCurrentEuiBreakpoint();
  const {
    services: { cloud, kibanaVersion },
  } = useKibana();
  const isTrial = cloud?.isInTrial() ?? false;

  return (
    <EuiFlexGroup gutterSize={currentBreakpoint === 'xl' ? 'l' : 'xl'} direction="column">
      <EuiFlexGroup gutterSize="l" alignItems="flexStart" direction="column">
        <EuiFlexItem
          css={css({
            // ensures the trial badge and version badge fill parent with space between
            alignSelf: 'stretch',
          })}
        >
          <EuiFlexGroup alignItems="center" justifyContent={isTrial ? 'spaceBetween' : 'flexEnd'}>
            {isTrial && cloud && (
              <EuiFlexItem grow={false}>
                <TrialUsageBadge cloud={cloud} />
              </EuiFlexItem>
            )}
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
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="l">
            <h1>
              {i18n.translate('xpack.search.gettingStarted.page.title', {
                defaultMessage: 'Get started with Elasticsearch.',
              })}
            </h1>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText grow={false} color="subdued" size="m">
            <p>
              {i18n.translate('xpack.search.gettingStarted.page.description', {
                defaultMessage:
                  'Connect your deployment and start building modern search for products, docs, chatbots, recommenders, and more.',
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <ElasticsearchConnectionDetails />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
