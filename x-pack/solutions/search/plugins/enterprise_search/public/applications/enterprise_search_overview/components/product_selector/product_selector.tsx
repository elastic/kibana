/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ApiKeyPanel } from '../../../shared/api_key/api_key_panel';
import { KibanaLogic } from '../../../shared/kibana';
import { SetSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { SearchLabsBanner } from '../../../shared/search_labs_banner/search_labs_banner';
import { SendEnterpriseSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';
import headerImage from '../../assets/search_header.png';
import { useRedirectToOnboardingStart } from '../../hooks/use_redirect_to_onboarding_start';

import { EnterpriseSearchOverviewPageTemplate } from '../layout';
import { TrialCallout } from '../trial_callout';

import { ElasticsearchProductCard } from './elasticsearch_product_card';
import { IngestionSelector } from './ingestion_selector';

import './product_selector.scss';
import { WelcomeBanner } from './welcome_banner';

export const ProductSelector: React.FC = () => {
  const { user } = useValues(KibanaLogic);

  const { isChecking: isCheckingOnboardingStatus } = useRedirectToOnboardingStart();

  // The create index flow does not work without ent-search, when content is updated
  // to no longer rely on ent-search we can always show the Add Content component

  return (
    <>
      <EnterpriseSearchOverviewPageTemplate
        restrictWidth
        grow
        offset={0}
        customPageSections
        data-test-subj="enterpriseSearchOverviewPage"
        isLoading={isCheckingOnboardingStatus}
      >
        <TrialCallout />
        <EuiPageTemplate.Section alignment="top" className="entSearchProductSelectorHeader">
          <WelcomeBanner user={user || undefined} image={headerImage} />
          <SetPageChrome />
          <SendTelemetry action="viewed" metric="overview" />
        </EuiPageTemplate.Section>

        <EuiPageTemplate.Section color="subdued">
          <ApiKeyPanel />
          <EuiSpacer size="xl" />
          <EuiTitle>
            <h2>
              {i18n.translate('xpack.enterpriseSearch.productSelector.overview.title', {
                defaultMessage: 'Ingest your content',
              })}
            </h2>
          </EuiTitle>
          <EuiSpacer size="l" />
          <EuiText>
            <p>
              {i18n.translate('xpack.enterpriseSearch.productSelector.overview.description', {
                defaultMessage:
                  'The first step in building your search experience is to create a search-optimized Elasticsearch index and import your content into it. Elasticsearch offers several user-friendly options you can choose from that best match your technical expertise and data sources.',
              })}
            </p>
          </EuiText>

          <EuiSpacer size="xl" />
          <IngestionSelector />
          <EuiSpacer />
          <EuiSpacer size="xl" />

          <EuiTitle>
            <h4>
              {i18n.translate(
                'xpack.enterpriseSearch.productSelector.overview.createCustom.title',
                {
                  defaultMessage: 'Create a custom search experience',
                }
              )}
            </h4>
          </EuiTitle>
          <EuiSpacer size="l" />
          <EuiText>
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.productSelector.overview.createCustom.description',
                {
                  defaultMessage:
                    "Once your index is created and populated, you'll be ready to use the full power of Elasticsearch. Build search applications using our out-of-the-box tools and programming language clients, all backed by a robust set of APIs.",
                }
              )}
            </p>
          </EuiText>

          <EuiSpacer size="xl" />

          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <ElasticsearchProductCard />
            </EuiFlexItem>
            <EuiFlexItem>
              <SearchLabsBanner />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageTemplate.Section>
      </EnterpriseSearchOverviewPageTemplate>
    </>
  );
};
