/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ConnectSourcesGrid } from '../sandbox_connectors/connect_sources_grid';
import { AddDataCard } from '../sandbox_connectors/add_data_card';

export type ConnectSubStep = 'telemetry' | 'additional';

export const CONNECT_SUB_STEP_TITLES: Record<ConnectSubStep, string> = {
  telemetry: i18n.translate('xpack.nightshift.onboarding.telemetry.title', {
    defaultMessage: 'Add telemetry data',
  }),
  additional: i18n.translate('xpack.nightshift.onboarding.connectors.title', {
    defaultMessage: 'Connect other sources',
  }),
};

export function OnboardingConnectStep({
  subStep,
}: {
  subStep: ConnectSubStep;
}): React.ReactElement {
  return (
    <div data-test-subj="nightshiftOnboardingConnectStep">
      {subStep === 'telemetry' ? (
        <div data-test-subj="nightshiftOnboardingTelemetry">
          <div data-test-subj="nightshiftOnboardingConnectors">
            <ConnectSourcesGrid group="telemetry" trailing={<AddDataCard />} />
          </div>
        </div>
      ) : (
        <div data-test-subj="nightshiftOnboardingAdditionalSources">
          <div data-test-subj="nightshiftOnboardingConnectors">
            <ConnectSourcesGrid group="additional" />
          </div>
        </div>
      )}
    </div>
  );
}
