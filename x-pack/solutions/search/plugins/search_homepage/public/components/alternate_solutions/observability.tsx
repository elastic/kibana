/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { docLinks } from '../../../common/doc_links';

export const Observability: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { http, cloud } = useKibana().services;

  const isServerless: boolean = cloud?.isServerlessEnabled ?? false;

  const o11yTrialLink = useMemo(() => {
    if (cloud && cloud.isServerlessEnabled) {
      const baseUrl = cloud?.projectsUrl ?? 'https://cloud.elastic.co/projects/';
      return `${baseUrl}create/observability/start`;
    }
    return http.basePath.prepend('/app/observability/onboarding');
  }, [cloud, http]);

  const o11yCreateSpaceLink = useMemo(() => {
    return http.basePath.prepend('/app/management/kibana/spaces/create');
  }, [http]);

  const analyzeLogsIntegration = useMemo(() => {
    return http.basePath.prepend('/app/integrations/browse/observability');
  }, [http]);

  return (
    <EuiFlexGroup gutterSize="m" data-test-subj="observabilitySection">
      <EuiFlexItem grow={false}>
        <EuiAvatar
          size="xl"
          color="plain"
          name="Observability"
          iconType="logoObservability"
          style={{ border: euiTheme.border.thin }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h4>
                {i18n.translate('xpack.searchHomepage.observability.title', {
                  defaultMessage: 'Observability',
                })}
              </h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <span>
                {i18n.translate('xpack.searchHomepage.observability.description', {
                  defaultMessage:
                    'Consolidate your logs, metrics, application traces, and system availability with purpose-built UIs.',
                })}
              </span>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSpacer size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" direction="column">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xxs">
                      <span>
                        {i18n.translate('xpack.searchHomepage.observability.logsTitle', {
                          defaultMessage: 'Collect and analyze logs',
                        })}
                      </span>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {isServerless ? (
                      <EuiLink
                        href={docLinks.analyzeLogs}
                        data-test-subj="exploreLogstashAndBeatsLink"
                      >
                        {i18n.translate('xpack.searchHomepage.observability.exploreLogstashBeats', {
                          defaultMessage: 'Explore Logstash and Beats',
                        })}
                      </EuiLink>
                    ) : (
                      <EuiLink
                        href={analyzeLogsIntegration}
                        data-test-subj="analyzeLogsBrowseIntegrations"
                      >
                        {i18n.translate('xpack.searchHomepage.observability.exploreLogstashBeats', {
                          defaultMessage: 'Explore Logstash and Beats',
                        })}
                      </EuiLink>
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" direction="column">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xxs">
                      <span>
                        {i18n.translate(
                          'xpack.searchHomepage.observability.performanceMonitoringTitle',
                          {
                            defaultMessage: 'Powerful performance monitoring',
                          }
                        )}
                      </span>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {isServerless ? (
                      <EuiLink href={o11yTrialLink} data-test-subj="createObservabilityProjectLink">
                        {i18n.translate(
                          'xpack.searchHomepage.observability.createObservabilityProjectLink',
                          {
                            defaultMessage: 'Create an Observability project',
                          }
                        )}
                      </EuiLink>
                    ) : (
                      <EuiLink
                        href={o11yCreateSpaceLink}
                        data-test-subj="createObservabilitySpaceLink"
                      >
                        {i18n.translate(
                          'xpack.searchHomepage.observability.createObservabilitySpaceLink',
                          {
                            defaultMessage: 'Create an Observability space',
                          }
                        )}
                      </EuiLink>
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
