/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  ConnectSourcesGrid,
  isTelemetryType,
} from '../../../components/entities/sandbox_connector/connect_sources_grid';
import { AddDataCard } from '../../../components/entities/sandbox_connector/add_data_card';

export const ADD_DATA_TITLE = i18n.translate('xpack.nightshift.onboarding.addData.title', {
  defaultMessage: 'Add data',
});

/** The "Add data" step: the telemetry connector types, then the Observability "Add data" card. */
export function OnboardingAddDataStep(): React.ReactElement {
  return (
    <div data-test-subj="nightshiftOnboardingAddDataStep">
      <ConnectSourcesGrid filter={isTelemetryType} trailing={<AddDataCard />} />
    </div>
  );
}
