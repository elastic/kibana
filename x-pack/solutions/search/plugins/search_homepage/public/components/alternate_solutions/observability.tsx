/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import React, { useMemo } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { LogoContainerStyle } from './styles';

export const Observability: React.FC = () => {
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

  return (
    <EuiFlexGroup justifyContent="flexStart" gutterSize="l" data-test-subj="observabilitySection">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="center" alignItems="flexStart">
          <EuiFlexItem css={LogoContainerStyle} grow={false}>
            <EuiIcon size="xxl" type="logoObservability" name="Observability" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.searchHomepage.observability.title', {
                  defaultMessage: 'Observability',
                })}
              </h3>
            </EuiTitle>
            <EuiText size="relative" color="subdued">
              <p>
                {i18n.translate('xpack.searchHomepage.observability.description', {
                  defaultMessage:
                    'Consolidate your logs, metrics, application traces, and system availability with purpose-built UIs.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
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
              <EuiLink href={o11yCreateSpaceLink} data-test-subj="createObservabilitySpaceLink">
                {i18n.translate('xpack.searchHomepage.observability.createObservabilitySpaceLink', {
                  defaultMessage: 'Create an Observability space',
                })}
              </EuiLink>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
