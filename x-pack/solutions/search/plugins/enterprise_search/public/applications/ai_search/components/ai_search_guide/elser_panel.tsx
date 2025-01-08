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

import { SEMANTIC_SEARCH_PLUGIN } from '../../../../../common/constants';
import { docLinks } from '../../../shared/doc_links';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';

export const ElserPanel: React.FC = () => {
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
                id="xpack.enterpriseSearch.aiSearch.elser.description"
                defaultMessage="The {elser} enables textual semantic search over your Elasticsearch documents in just a few commands. Use the 'semantic_text' field to simplify model deployment and generate sparse vector document embeddings."
                values={{
                  elser: (
                    <EuiLink
                      data-test-subj="enterpriseSearchElserPanelElasticLearnedSparseEncoderV2Link"
                      target="_blank"
                      href={docLinks.elser}
                      external={false}
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.aiSearch.elser.description.elserLinkText',
                        {
                          defaultMessage: 'Elastic Learned Sparse Encoder v2',
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
            data-test-subj="enterpriseSearchElserPanelLink"
            onClick={() => {
              application.navigateToUrl(
                http.basePath.prepend(`${SEMANTIC_SEARCH_PLUGIN.URL}?model_example=elser`)
              );
            }}
          >
            <EuiButton
              data-test-subj="enterpriseSearchElserPanelSetupSemanticSearchButton"
              data-telemetry-id="entSearch-aiSearch-semanticSearch-elserPanel-setupSemanticSearch"
            >
              {i18n.translate('xpack.enterpriseSearch.aiSearch.elserPanel.buttonLabel', {
                defaultMessage: 'Set up Semantic Search',
              })}
            </EuiButton>
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
