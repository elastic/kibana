/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';
import { compressToEncodedURIComponent } from 'lz-string';

import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { useCloudDetails } from '../../../../shared/cloud_details/cloud_details';
import { docLinks } from '../../../../shared/doc_links';
import { KibanaLogic } from '../../../../shared/kibana';
import { SearchApplicationViewLogic } from '../search_application_view_logic';

import { elasticsearchUrl } from './search_application_api';
import { SearchApplicationApiLogic } from './search_application_api_logic';

const clientSnippet = (esUrl: string, searchApplicationName: string, apiKey: string) => `
import Client from '@elastic/search-application-client'
// or through CDN
// const Client = window['SearchApplicationClient']

const request = Client(
  ${searchApplicationName},
  ${esUrl},
  ${apiKey || '<YOUR_API_KEY>'},
)

const results = await request()
  .query('pizza')
  .addParameter('myCustomParameter', 'example value')
  .search()
`;

const cURLSnippet = (
  esUrl: string,
  searchApplicationName: string,
  apiKey: string,
  params: unknown
) => `
curl --location --request POST '${esUrl}/_application/search_application/${searchApplicationName}/_search' \\
--header 'Authorization: apiKey ${apiKey || '<YOUR_API_KEY>'}' \\
--header 'Content-Type: application/json' \\
--data-raw '${JSON.stringify({ params }, null, 2)}'`;

const consoleSnippet = (searchApplicationName: string, params: unknown) => {
  const body = JSON.stringify({ params }, null, 2);
  return `
POST /_application/search_application/${searchApplicationName}/_search
${body}
`;
};

const consoleRequest = (searchApplicationName: string, params: unknown) =>
  `POST /_application/search_application/${searchApplicationName}/_search
${JSON.stringify({ params }, null, 2)}`;

type TabId = 'apirequest' | 'client' | 'curl';

interface Tab {
  code: string;
  copy: boolean;
  language: string;
  title: string;
}

export const SearchApplicationApiIntegrationStage: React.FC = () => {
  const { application, share } = useValues(KibanaLogic);
  const [selectedTab, setSelectedTab] = React.useState<TabId>('apirequest');
  const { searchApplicationName } = useValues(SearchApplicationViewLogic);
  const { apiKey } = useValues(SearchApplicationApiLogic);
  const cloudContext = useCloudDetails();

  const params = { query: 'pizza', myCustomParameter: 'example value' };
  const Tabs: Record<TabId, Tab> = {
    apirequest: {
      code: consoleSnippet(searchApplicationName, params),
      copy: false,
      language: 'http',
      title: i18n.translate(
        'xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.tab.consoleTitle',
        {
          defaultMessage: 'Console',
        }
      ),
    },
    client: {
      code: clientSnippet(elasticsearchUrl(cloudContext), searchApplicationName, apiKey),
      copy: true,
      language: 'javascript',
      title: i18n.translate(
        'xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.tab.clientTitle',
        {
          defaultMessage: 'Javascript Client',
        }
      ),
    },
    curl: {
      code: cURLSnippet(elasticsearchUrl(cloudContext), searchApplicationName, apiKey, params),
      copy: true,
      language: 'bash',
      title: i18n.translate(
        'xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.tab.curlTitle',
        {
          defaultMessage: 'cURL',
        }
      ),
    },
  };

  const canShowDevtools = !!application?.capabilities?.dev_tools?.show;
  const consolePreviewLink = canShowDevtools
    ? share?.url.locators.get('CONSOLE_APP_LOCATOR')?.useUrl(
        {
          loadFrom: `data:text/plain,${compressToEncodedURIComponent(
            consoleRequest(searchApplicationName, params)
          )}`,
        },
        undefined,
        []
      )
    : null;

  return (
    <>
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.step4.description"
            defaultMessage="Simplify your API calls. We recommend using the JavaScript client."
          />
        </p>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiTabs>
        {Object.entries(Tabs).map(([tabId, tab]) => (
          <EuiTab
            key={tabId}
            isSelected={selectedTab === tabId}
            onClick={() => setSelectedTab(tabId as TabId)}
            data-telemetry-id={`entSearchApplications-searchApi-integration-tab-${tabId}`}
          >
            {tab.title}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="l" />
      {selectedTab === 'client' && (
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiText>
              <h5>
                {i18n.translate(
                  'xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.step4.installationTitle',
                  {
                    defaultMessage: 'Installation',
                  }
                )}
              </h5>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="inherit">
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.step4.npmInstallDescription',
                  {
                    defaultMessage:
                      'Search application client is accessible from NPM package registry',
                  }
                )}
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiCodeBlock isCopyable lang="bash">
              {`npm install @elastic/search-application-client`}
            </EuiCodeBlock>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiText color="inherit">
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.step4.cdnInstallDescription',
                  {
                    defaultMessage: 'or via CDN',
                  }
                )}
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiCodeBlock isCopyable lang="html">
              {`<script src="https://cdn.jsdelivr.net/npm/@elastic/search-application-client@latest"></script>`}
            </EuiCodeBlock>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiText color="inherit">
              <h5>
                {i18n.translate(
                  'xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.step4.clientUsageTitle',
                  {
                    defaultMessage: 'Usage',
                  }
                )}
              </h5>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <FormattedMessage
                id="xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.step4.clientUsageDescription"
                defaultMessage="To get the most out of the JavaScript client, use the client's example template and follow our {searchapplicationSearchDocLink} on building a search experience."
                values={{
                  searchapplicationSearchDocLink: (
                    <EuiLink href={docLinks.searchApplicationsSearch}>
                      {i18n.translate(
                        'xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.step3.clientDocumenation',
                        {
                          defaultMessage: 'how to guide',
                        }
                      )}
                    </EuiLink>
                  ),
                }}
              />
            </EuiText>
            <EuiSpacer size="m" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiCodeBlock isCopyable={Tabs[selectedTab].copy} language={Tabs[selectedTab].language}>
        {Tabs[selectedTab].code}
      </EuiCodeBlock>
      {selectedTab === 'apirequest' && consolePreviewLink && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup direction="column" alignItems="flexEnd">
            <EuiLink href={consolePreviewLink} target="_blank">
              <FormattedMessage
                id="xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.step4.consoleButton"
                defaultMessage="Try in console"
              />
            </EuiLink>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
