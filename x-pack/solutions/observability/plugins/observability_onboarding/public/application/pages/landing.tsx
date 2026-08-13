/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiPageTemplate, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useState } from 'react';
import type { ObservabilityOnboardingAppServices } from '../..';
import { IS_ADD_DATA_PAGE_V2_ENABLED } from '../../../common/feature_flags';
import { AddDataSearchBar, DocsLinksSection } from '../add_data_grid';
import type { CollectionCardItem } from '../add_data_page/collection_card';
import { CollectionFlyout } from '../add_data_page/collection_flyout';
import { ObservabilityIntegrationsSection } from '../add_data_page/integrations_section';
import { useObservabilityDocsLinks } from '../add_data_page/observability_docs_links';
import { ObservabilitySearchResults } from '../add_data_page/observability_search_results';
import { useAddDataSearchUrlSync } from '../add_data_page/use_add_data_search_url_sync';
import { ApiEndpoints } from '../api_endpoints/api_endpoints';
import { LandingHeader } from '../header';
import { OnboardingFlowForm } from '../onboarding_flow_form/onboarding_flow_form';
import { PageTemplate } from './template';

const ObservabilityDocsLinksSection = () => {
  const items = useObservabilityDocsLinks();
  return <DocsLinksSection items={items} />;
};

const AddDataPageV2 = () => {
  const [searchValue, setSearchValue] = useAddDataSearchUrlSync();
  const searchTerm = searchValue.trim();
  // Hosted here rather than inside the results, so surfaces other than a
  // search result card can open the same chooser.
  const [openCollection, setOpenCollection] = useState<CollectionCardItem | null>(null);

  return (
    <EuiPageTemplate paddingSize="none" data-test-subj="addDataPageV2">
      <LandingHeader />
      <EuiPageTemplate.Section paddingSize="xl" restrictWidth>
        <AddDataSearchBar
          value={searchValue}
          onChange={setSearchValue}
          placeholder={i18n.translate('xpack.observability_onboarding.searchBar.placeholder', {
            defaultMessage: 'Search integrations, content packages, etc.',
          })}
          data-test-subj="observabilityOnboardingIntegrationsSearchFieldSearch"
        />
        {searchTerm !== '' && (
          <>
            <EuiSpacer size="l" />
            <ObservabilitySearchResults
              searchTerm={searchTerm}
              onOpenCollection={setOpenCollection}
            />
          </>
        )}
        <EuiHorizontalRule margin="xl" />
        <ObservabilityIntegrationsSection />
        <ApiEndpoints titleTag="h2" />
        <EuiHorizontalRule margin="xl" />
        <ObservabilityDocsLinksSection />
      </EuiPageTemplate.Section>
      {openCollection && (
        <CollectionFlyout card={openCollection} onClose={() => setOpenCollection(null)} />
      )}
    </EuiPageTemplate>
  );
};

export const LandingPage = () => {
  const {
    services: { featureFlags },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const isAddDataPageV2Enabled = featureFlags.getBooleanValue(IS_ADD_DATA_PAGE_V2_ENABLED, false);

  if (isAddDataPageV2Enabled) {
    return <AddDataPageV2 />;
  }

  return (
    <PageTemplate>
      <OnboardingFlowForm />
    </PageTemplate>
  );
};
