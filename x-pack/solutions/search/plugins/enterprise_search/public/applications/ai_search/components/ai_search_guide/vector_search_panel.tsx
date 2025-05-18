/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { VECTOR_SEARCH_PLUGIN } from '../../../../../common/constants';
import { docLinks } from '../../../shared/doc_links';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';

export const VectorSearchPanel: React.FC = () => {
  const { http } = useValues(HttpLogic);
  const { application } = useValues(KibanaLogic);

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.aiSearch.vectorSearchPanel.description"
                defaultMessage="Use {vectorDbCapabilities} by adding embeddings from your ML models."
                values={{
                  vectorDbCapabilities: (
                    <EuiLink
                      data-test-subj="enterpriseSearchVectorSearchPanelElasticsearchsVectorDbCapabilitiesLink"
                      data-telemetry-id="entSearch-aiSearch-semanticSearch-vectorSearchPanel-knnSearchLink"
                      target="_blank"
                      href={docLinks.knnSearch}
                      external={false}
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.aiSearch.vectorSearchPanel.description.vectorDbCapabilitiesLinkText',
                        {
                          defaultMessage: "Elasticsearch's vector DB capabilities",
                        }
                      )}
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink
            data-test-subj="enterpriseSearchVectorSearchPanelLink"
            onClick={() => {
              application.navigateToUrl(http.basePath.prepend(`${VECTOR_SEARCH_PLUGIN.URL}`));
            }}
          >
            <EuiButton
              data-test-subj="enterpriseSearchVectorSearchPanelCreateAnIndexButton"
              data-telemetry-id="entSearch-aiSearch-semanticSearch-vectorSearchPanel-vectorSearchPage"
            >
              {i18n.translate('xpack.enterpriseSearch.aiSearch.vectorSearchPanel.buttonLabel', {
                defaultMessage: 'Set up Vector Search',
              })}
            </EuiButton>
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
