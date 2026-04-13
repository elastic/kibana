/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
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
import { i18n } from '@kbn/i18n';
import { KibanaVersionBadge } from '@kbn/search-shared-ui';

import { docLinks } from '../../common/doc_links';
import { useKibana } from '../../hooks/use_kibana';
import { ElasticsearchConnectionDetails } from '../elasticsearch_connection_details';
import { TrialBadgeContainerStyle } from './styles';

export const SearchGettingStartedHeader: React.FC = () => {
  const currentBreakpoint = useCurrentEuiBreakpoint();
  const {
    services: { cloud, kibanaVersion },
  } = useKibana();
  const cloudHomeHref = useMemo(() => {
    if (!cloud) return undefined;
    if (!cloud.isInTrial()) return undefined;
    const cloudUrls = cloud.getUrls();
    if (!cloudUrls.baseUrl) return undefined;
    return cloudUrls.baseUrl;
  }, [cloud]);

  return (
    <EuiFlexGroup gutterSize={currentBreakpoint === 'xl' ? 'l' : 'xl'} direction="column">
      <EuiFlexGroup gutterSize="l" alignItems="flexStart" direction="column">
        <EuiFlexItem css={css({ alignSelf: 'stretch' })}>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              {cloudHomeHref ? (
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
              ) : (
                <span />
              )}
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
