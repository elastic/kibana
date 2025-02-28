/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiCard, EuiFlexGrid, EuiFlexItem, EuiIcon, EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../hooks/use_kibana';

import {
  SEARCH_UX_GITHUB_TEAM_HANDLER,
  SEARCH_UX_GITHUB_TEAM_URL,
  SEARCH_UX_SLACK_CHANNEL_NAME,
  SEARCH_UX_SLACK_CHANNEL_URL,
} from '../../common/constants';

export const SearchUxSandboxHome = () => {
  const {
    services: { history },
  } = useKibana();

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      grow={false}
      data-test-subj="searchUxSandboxOverviewPage"
      color="primary"
    >
      <KibanaPageTemplate.Header pageTitle="Search UX Sandbox" restrictWidth color="primary">
        <EuiText>
          <FormattedMessage
            id="xpack.searchUxSandbox.searchUxSandboxOverview.description"
            defaultMessage="Code prototypes made with ❤️ by the Search UX team. "
          />
          <EuiLink
            data-test-subj="SearchUxSandboxHomeSearchUxLink"
            href={SEARCH_UX_SLACK_CHANNEL_URL}
            external
          >
            {SEARCH_UX_SLACK_CHANNEL_NAME}
          </EuiLink>{' '}
          <EuiLink
            data-test-subj="SearchUxSandboxHomeSearchDesignLink"
            href={SEARCH_UX_GITHUB_TEAM_URL}
            external
          >
            {SEARCH_UX_GITHUB_TEAM_HANDLER}
          </EuiLink>
        </EuiText>
      </KibanaPageTemplate.Header>

      <KibanaPageTemplate.Section restrictWidth>
        <EuiFlexGrid columns={4}>
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xxl" type="beaker" />}
              title="Project example"
              description="Basic example to start with."
              onClick={() => {
                history.push('/project-example');
              }}
            />
          </EuiFlexItem>
        </EuiFlexGrid>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
