/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiImage,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiHorizontalRule,
  EuiFlexGrid,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import analyticsIllustration from '../../../../assets/images/analytics.svg';
import scalableIllustration from '../../../../assets/images/scalable.svg';
import simplifyIllustration from '../../../../assets/images/simplify.svg';
import { SetAiSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { EnterpriseSearchAISearchPageTemplate } from '../layout/page_template';

import { SetAISearchChromeSearchDocsSection } from './ai_search_docs_section';
import { MeasurePerformanceSection } from './measure_performance_section';
import { RankAggregationSection } from './rank_aggregation_section';
import { SemanticSearchSection } from './semantic_search_section';

export const AISearchGuide: React.FC = () => {
  const isMobile = useIsWithinBreakpoints(['xs']);

  return (
    <EnterpriseSearchAISearchPageTemplate
      restrictWidth
      bottomBorder={false}
      pageHeader={{
        pageTitle: i18n.translate('xpack.enterpriseSearch.aiSearch.guide.pageTitle', {
          defaultMessage: 'Improve search relevance with AI',
        }),
      }}
    >
      <SetPageChrome />
      <EuiPanel color="transparent" paddingSize="none">
        <EuiFlexGroup justifyContent="spaceBetween" direction="column" responsive>
          <EuiFlexItem grow>
            <EuiPanel color="subdued" hasShadow={false}>
              <EuiFlexGrid alignItems="center" responsive={false} columns={isMobile ? 1 : 3}>
                <EuiFlexItem grow={false}>
                  <EuiImage size="m" src={simplifyIllustration} alt="" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiImage size="m" src={analyticsIllustration} alt="" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiImage size="m" src={scalableIllustration} alt="" />
                </EuiFlexItem>
              </EuiFlexGrid>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiText>
              <p data-test-subj="ai-search-description-text">
                <FormattedMessage
                  id="xpack.enterpriseSearch.aiSearch.guide.description"
                  defaultMessage="Build AI search-powered applications using the Elastic platform, including our proprietary trained ML model ELSER, our vector search and embeddings capabilities, and RRF ranking for combining vector and text search."
                />
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <SemanticSearchSection />
          </EuiFlexItem>
          <EuiHorizontalRule />
          <EuiFlexItem grow>
            <RankAggregationSection />
          </EuiFlexItem>
          <EuiHorizontalRule />
          <EuiFlexItem grow>
            <SetAISearchChromeSearchDocsSection />
          </EuiFlexItem>
          <EuiHorizontalRule />
          <EuiFlexItem grow>
            <MeasurePerformanceSection />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EnterpriseSearchAISearchPageTemplate>
  );
};
