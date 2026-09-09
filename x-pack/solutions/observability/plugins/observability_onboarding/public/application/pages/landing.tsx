/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiPageTemplate, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useCallback } from 'react';
import { useSearchParams } from '@kbn/shared-ux-router';
import { useHistory } from 'react-router-dom';
import type { ObservabilityOnboardingAppServices } from '../..';
import { IS_ADD_DATA_PAGE_V2_ENABLED } from '../../../common/feature_flags';
import { AddDataSearchBar, DocsLinksSection } from '../add_data_grid';
import { CollectionChooser } from '../add_data_page/collection_chooser';
import { FleetCardsProvider } from '../add_data_page/fleet_cards_provider';
import { ObservabilityIntegrationsSection } from '../add_data_page/integrations_section';
import { useObservabilityDocsLinks } from '../add_data_page/observability_docs_links';
import { ObservabilitySearchResults } from '../add_data_page/observability_search_results';
import { useAddDataSearchUrlSync } from '../add_data_page/use_add_data_search_url_sync';
import { useCollectionTilesEnabled } from '../add_data_page/use_collection_tiles_enabled';
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
  const [searchParams] = useSearchParams();
  const history = useHistory();
  // The url is the only record of which chooser is open, so it survives a refresh
  // and a return from a member's detail page with nothing to fall out of step.
  const openCollection = searchParams.get('collection') ?? undefined;

  const setCollectionParam = useCallback(
    (groupId?: string) => {
      const { pathname, search } = history.location;
      const next = new URLSearchParams(search);
      if ((next.get('collection') ?? undefined) === groupId) return;
      if (groupId) {
        next.set('collection', groupId);
      } else {
        next.delete('collection');
      }
      history.replace({ pathname, search: next.toString() });
    },
    [history]
  );

  const closeCollection = useCallback(() => setCollectionParam(undefined), [setCollectionParam]);

  // Fleet's packages are only worth fetching for the search results and for the
  // grid badges Fleet's grouping flag turns on. A default visit needs neither, so
  // it makes no registry request.
  const needsFleetPackages = useCollectionTilesEnabled() || searchTerm !== '';

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
        <FleetCardsProvider enabled={needsFleetPackages}>
          {searchTerm !== '' && (
            <>
              <EuiSpacer size="l" />
              <ObservabilitySearchResults
                searchTerm={searchTerm}
                onOpenCollection={setCollectionParam}
              />
            </>
          )}
          <EuiHorizontalRule margin="xl" />
          <ObservabilityIntegrationsSection onOpenCollection={setCollectionParam} />
          {/* Inside the provider because it reads Fleet's cards; the flyout portals out. */}
          <CollectionChooser
            collection={openCollection}
            searchTerm={searchTerm}
            onClose={closeCollection}
          />
        </FleetCardsProvider>
        <ApiEndpoints titleTag="h2" />
        <EuiHorizontalRule margin="xl" />
        <ObservabilityDocsLinksSection />
      </EuiPageTemplate.Section>
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
