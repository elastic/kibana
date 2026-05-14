/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldSearch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const IntegrationsSearch = () => {
  const placeholder = i18n.translate(
    'xpack.observability_onboarding.integrationsGrid.search.placeholder',
    { defaultMessage: 'Search integrations' }
  );

  return (
    <EuiFieldSearch
      data-test-subj="observabilityOnboardingIntegrationsSearchFieldSearch"
      placeholder={placeholder}
      aria-label={placeholder}
      fullWidth
      compressed
    />
  );
};
