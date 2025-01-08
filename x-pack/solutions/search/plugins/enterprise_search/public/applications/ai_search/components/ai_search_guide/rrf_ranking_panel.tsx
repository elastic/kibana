/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiSteps, EuiText } from '@elastic/eui';
import { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../shared/doc_links';

const steps: EuiContainedStepProps[] = [
  {
    title: i18n.translate('xpack.enterpriseSearch.aiSearch.rrfRankingPanel.step1.title', {
      defaultMessage: 'Discover examples of using RRF in _search queries',
    }),
    children: (
      <EuiLink
        data-test-subj="enterpriseSearchReciprocalRankFusionDocumentationLink"
        data-telemetry-id="entSearch-aiSearch-rankAggregation-rrfRankingPanel-rrfDocsLink"
        href={docLinks.rrf}
        target="_blank"
        external
      >
        {i18n.translate('xpack.enterpriseSearch.aiSearch.rrfRankingPanel.step1.rrfDocsLinkText', {
          defaultMessage: 'Reciprocal Rank Fusion documentation',
        })}
      </EuiLink>
    ),
    status: 'incomplete',
  },
  {
    title: i18n.translate('xpack.enterpriseSearch.aiSearch.rrfRankingPanel.step2.title', {
      defaultMessage: 'Example Python Code',
    }),
    children: (
      <EuiLink
        data-test-subj="enterpriseSearchLink"
        data-telemetry-id="entSearch-aiSearch-rankAggregation-rrfRankingPanel-devToolsConsoleButton"
        href={docLinks.searchLabsRepo + 'blob/main/notebooks/search/02-hybrid-search.ipynb'}
        target="_blank"
        external
      >
        {i18n.translate('xpack.enterpriseSearch.aiSearch.rrfRankingPanel.step2.buttonLabel', {
          defaultMessage: 'View Notebook',
        })}
      </EuiLink>
    ),
    status: 'incomplete',
  },
];

export const RrfRankingPanel: React.FC = () => (
  <>
    <EuiSpacer />
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.aiSearch.rrfRankingPanel.description"
              data-telemetry-id="entSearch-aiSearch-semanticSearch-rrfRankingPanel-rrfDocsLink"
              defaultMessage="Use {rrf} to combine rankings from multiple result sets with different relevance indicators, with no fine tuning required."
              values={{
                rrf: (
                  <EuiLink
                    data-test-subj="enterpriseSearchRrfRankingPanelReciprocalRankFusionRrfLink"
                    target="_blank"
                    href={docLinks.rrf}
                    external={false}
                  >
                    {i18n.translate('xpack.enterpriseSearch.aiSearch.rrfRankingPanel.rrfLinkText', {
                      defaultMessage: 'Reciprocal Rank Fusion (RRF)',
                    })}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSteps steps={steps} titleSize="xs" />
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);
