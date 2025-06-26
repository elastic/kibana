/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import type { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import { i18n } from '@kbn/i18n';

const ADD_DATA_KUBERNETES_LABEL = i18n.translate('xpack.infra.metricsHeaderAddDataButtonLabel', {
  defaultMessage: 'Add Kubernetes data',
});

export const AddKubernetesDataLink = () => {
  const { share } = useKibana<{ share: SharePublicStart }>().services;
  const onboardingLocator = share?.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );

  return (
    <EuiLink
      data-test-subj="infraAddDataLink"
      href={onboardingLocator?.getRedirectUrl({
        category: 'kubernetes',
      })}
      color="primary"
    >
      {ADD_DATA_KUBERNETES_LABEL}
    </EuiLink>
  );
};
