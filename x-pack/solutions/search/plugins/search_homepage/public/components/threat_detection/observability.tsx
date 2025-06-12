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
  EuiImage,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import ObservabilityImage from '../../../public/assets/observability.svg';

export const Observability: React.FC = () => (
  <EuiFlexGroup gutterSize="m">
    <EuiFlexItem grow={false}>
      <EuiImage
        src={ObservabilityImage}
        alt={i18n.translate('xpack.searchHomepage.observability.imageAlt', {
          defaultMessage: 'Observability',
        })}
        size="xs"
      />
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
                  <EuiLink target="_blank" data-test-subj="exploreLogstashAndBeatsLink">
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
                  <EuiLink target="_blank" data-test-subj="createObservabilityProjectLink">
                    {i18n.translate('xpack.searchHomepage.observability.observabilityProjectLink', {
                      defaultMessage: 'Create an Observability project',
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
