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

export const SearchUxSandboxHome = () => {
  const {
    services: { history, searchNavigation },
  } = useKibana();

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      grow={false}
      data-test-subj="searchUxSandboxOverviewPage"
      solutionNav={searchNavigation?.useClassicNavigation(history)}
      color="primary"
    >
      <KibanaPageTemplate.Header pageTitle="Search UX Sandbox 🕹️" restrictWidth color="primary">
        <EuiText>
          <FormattedMessage
            id="xpack.searchUxSandbox.searchUxSandboxOverview.description"
            defaultMessage="Code prototypes made with ❤️ by the Search UX team. "
          />
          <EuiLink
            data-test-subj="SearchUxSandboxHomeSearchUxLink"
            href="https://elastic.slack.com/archives/CA2JBRTEX"
            external
          >
            #search-ux
          </EuiLink>{' '}
          <EuiLink
            data-test-subj="SearchUxSandboxHomeSearchDesignLink"
            href="https://github.com/orgs/elastic/teams/search-design"
            external
          >
            @search-design
          </EuiLink>
        </EuiText>
      </KibanaPageTemplate.Header>

      <KibanaPageTemplate.Section restrictWidth>
        <EuiFlexGrid columns={4}>
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xxl" type="beaker" />}
              title="Project example"
              description="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
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
