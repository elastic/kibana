/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import type { ObservabilityOnboardingAppServices } from '../..';
import { IS_ADD_DATA_PAGE_V2_ENABLED } from '../../../common/feature_flags';
import { useAddDataSearchUrlSync } from '../add_data_page/use_add_data_search_url_sync';
import { ObservabilityIntegrationsSection } from '../add_data_page/integrations_section';
import { ApiEndpoints } from '../api_endpoints/api_endpoints';
import { LandingHeader } from '../header';
import { OnboardingFlowForm } from '../onboarding_flow_form/onboarding_flow_form';
import { PageTemplate } from './template';

const AddDataPageV2 = () => {
  const [searchValue, setSearchValue] = useAddDataSearchUrlSync();

  return (
    <EuiPageTemplate paddingSize="none" data-test-subj="addDataPageV2">
      <LandingHeader />
      <EuiPageTemplate.Section paddingSize="xl" restrictWidth>
        <ObservabilityIntegrationsSection
          searchValue={searchValue}
          onSearchChange={setSearchValue}
        />
        <ApiEndpoints />
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
