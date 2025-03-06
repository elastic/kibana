/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiButton, EuiCallOut, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../shared/doc_links';
import { KibanaLogic } from '../../../shared/kibana';
import { isApiIndex, isConnectorIndex } from '../../utils/indices';

import { ConvertConnectorModal } from '../shared/convert_connector_modal/convert_connector_modal';

import { ApiTotalStats } from './api_total_stats';
import { ConvertConnectorLogic } from './connector/native_connector_configuration/convert_connector_logic';
import { ConnectorTotalStats } from './connector_total_stats';
import { GenerateApiKeyPanel } from './generate_api_key_panel';
import { IndexViewLogic } from './index_view_logic';
import { OverviewLogic } from './overview.logic';
import { SyncJobs } from './sync_jobs/sync_jobs';

export const SearchIndexOverview: React.FC = () => {
  const { indexData } = useValues(OverviewLogic);
  const { error } = useValues(IndexViewLogic);
  const { isCloud } = useValues(KibanaLogic);
  const { showModal } = useActions(ConvertConnectorLogic);
  const { isModalVisible } = useValues(ConvertConnectorLogic);

  return (
    <>
      <EuiSpacer />
      {isConnectorIndex(indexData) && error && (
        <>
          <EuiCallOut
            iconType="warning"
            color="danger"
            title={i18n.translate(
              'xpack.enterpriseSearch.content.searchIndex.connectorErrorCallOut.title',
              {
                defaultMessage: 'Your connector has reported an error',
              }
            )}
          >
            <EuiSpacer size="s" />
            <EuiText size="s">{error}</EuiText>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      {isConnectorIndex(indexData) && indexData.connector.is_native && !isCloud && (
        <>
          {isModalVisible && <ConvertConnectorModal />}
          <EuiCallOut
            iconType="warning"
            color="warning"
            title={i18n.translate(
              'xpack.enterpriseSearch.content.searchIndex.nativeCloudCallout.title',
              {
                defaultMessage: 'Native connectors are no longer supported outside Elastic Cloud',
              }
            )}
          >
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.searchIndex.nativeCloudCallout.content"
                  defaultMessage="Convert it to a {link}, to be self-managed on your own infrastructure. Native connectors are available only in your Elastic Cloud deployment."
                  values={{
                    link: (
                      <EuiLink
                        data-test-subj="enterpriseSearchSearchIndexOverviewConnectorClientLink"
                        href={docLinks.buildConnector}
                        target="_blank"
                      >
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.searchIndex.nativeCloudCallout.connectorClient',
                          { defaultMessage: 'self-managed connector' }
                        )}
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiButton
              data-test-subj="enterpriseSearchSearchIndexOverviewConvertConnectorButton"
              color="warning"
              fill
              onClick={() => showModal()}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.searchIndex.convertConnector.buttonLabel',
                { defaultMessage: 'Convert connector' }
              )}
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      {isConnectorIndex(indexData) ? <ConnectorTotalStats /> : <ApiTotalStats />}
      {isApiIndex(indexData) && (
        <>
          <EuiSpacer />
          <GenerateApiKeyPanel />
        </>
      )}
      {isConnectorIndex(indexData) && (
        <>
          <EuiSpacer />
          <SyncJobs connector={indexData.connector} />
        </>
      )}
    </>
  );
};
