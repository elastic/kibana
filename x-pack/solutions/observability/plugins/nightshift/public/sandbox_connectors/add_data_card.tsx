/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  OBSERVABILITY_ONBOARDING_APP_ID,
  OBSERVABILITY_ONBOARDING_LOCATOR,
  type ObservabilityOnboardingLocatorParams,
} from '@kbn/deeplinks-observability';
import { useKibana } from '../hooks/use_kibana';
import { SourceCard } from './source_card';

export function AddDataCard(): React.ReactElement {
  const { application, share } = useKibana().services;
  const locator = share.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );
  const href = locator
    ? locator.getRedirectUrl({})
    : application.getUrlForApp(OBSERVABILITY_ONBOARDING_APP_ID);

  return (
    <SourceCard
      icon="rocket"
      title={i18n.translate('xpack.nightshift.addDataCard.title', {
        defaultMessage: 'Add data in 10+ other ways',
      })}
      description={i18n.translate('xpack.nightshift.addDataCard.description', {
        defaultMessage:
          'Monitor your applications, track hosts or ingest telemetry data from different cloud providers.',
      })}
      data-test-subj="nightshiftAddDataCard"
      action={{
        label: i18n.translate('xpack.nightshift.addDataCard.button', {
          defaultMessage: 'Add data',
        }),
        icon: 'plusCircle',
        onClick: () => application.navigateToUrl(href),
        'data-test-subj': 'nightshiftAddDataButton',
      }}
    />
  );
}
