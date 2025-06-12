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
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiLink,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';
const EXPLORE_LOGSTASH_AND_BEATS = '/app/integrations/browse/observability';
const CREATE_OBSERVABILITY_SPACE = '/app/management/kibana/spaces/create';

export const Observability: React.FC = () => {
  const { http } = useKibana().services;
  return (
    <EuiFlexGroup gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiIcon type="logoObservability" size="xl" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <span>
                {i18n.translate('xpack.searchHomepage.observability.title', {
                  defaultMessage: 'Observability',
                })}
              </span>
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
                    <EuiLink
                      href={http.basePath.prepend(EXPLORE_LOGSTASH_AND_BEATS)}
                      target="_blank"
                      data-test-subj="exploreLogstashAndBeatsLink"
                    >
                      {i18n.translate('xpack.searchHomepage.observability.exploreLogstashBeats', {
                        defaultMessage: 'Explore Logstash and Beats',
                      })}
                    </EuiLink>
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
                    <EuiLink
                      href={http.basePath.prepend(CREATE_OBSERVABILITY_SPACE)}
                      target="_blank"
                      data-test-subj="createObservabilityProjectLink"
                    >
                      {i18n.translate('xpack.searchHomepage.observability.observabilitySpaceLink', {
                        defaultMessage: 'Create an Observability space',
                      })}
                    </EuiLink>
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
