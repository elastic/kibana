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
  EuiBadge,
  EuiButtonEmpty,
} from '@elastic/eui';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import { i18n } from '@kbn/i18n';
import { KibanaVersionBadge } from '@kbn/search-shared-ui';

import { docLinks } from '../../common/doc_links';
import { useKibana } from '../../hooks/use_kibana';
import { ElasticsearchConnectionDetails } from '../elasticsearch_connection_details';
import { TrialBadgeContainerStyle } from './styles';

function getCloudBaseWhenInTrial(cloud?: CloudStart): string | undefined {
  if (!cloud) return undefined;
  if (!cloud.isInTrial()) return undefined;
  const cloudUrls = cloud.getUrls();
  return cloudUrls.baseUrl;
}

export const SearchGettingStartedHeader: React.FC = () => {
  const currentBreakpoint = useCurrentEuiBreakpoint();
  const {
    services: { cloud, kibanaVersion },
  } = useKibana();
  const cloudHomeHref = getCloudBaseWhenInTrial(cloud);

  return (
    <EuiFlexGroup gutterSize={currentBreakpoint === 'xl' ? 'l' : 'xl'} direction="column">
      <EuiFlexGroup gutterSize="l" alignItems="flexStart" direction="column">
        <EuiFlexItem
          css={css({
            // ensures the trial badge and version badge fill parent with space between
            alignSelf: 'stretch',
          })}
        >
          <EuiFlexGroup
            alignItems="center"
            justifyContent={cloudHomeHref ? 'spaceBetween' : 'flexEnd'}
          >
            {cloudHomeHref && (
              <EuiFlexItem
                grow={false}
                css={css({
                  // Ensure trial badge does not grow to fill space when on smaller screens
                  alignItems: 'flex-start',
                })}
              >
                <EuiFlexGroup
                  alignItems="center"
                  gutterSize="s"
                  css={TrialBadgeContainerStyle}
                  responsive={false}
                >
                  <EuiFlexItem grow={false}>
                    <span>
                      <EuiBadge color="primary" fill>
                        {i18n.translate('xpack.search.gettingStarted.page.trialBadge', {
                          defaultMessage: 'TRIAL',
                        })}
                      </EuiBadge>
                    </span>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-test-subj="cloudHomeLink"
                      color="primary"
                      size="xs"
                      href={cloudHomeHref}
                    >
                      {i18n.translate('xpack.search.gettingStarted.page.cloudHomeLink', {
                        defaultMessage: 'Elastic Cloud',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
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
