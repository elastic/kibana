/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConnectSourcesGrid } from '../sandbox_connectors/connect_sources_grid';
import { AddDataCard } from '../sandbox_connectors/add_data_card';

/** The two pages of the "Add data" step: the telemetry sources first, then everything else. */
export type ConnectSubStep = 'telemetry' | 'additional';

export function OnboardingConnectStep({
  subStep,
}: {
  subStep: ConnectSubStep;
}): React.ReactElement {
  return (
    <div data-test-subj="nightshiftOnboardingConnectStep">
      {subStep === 'telemetry' ? <TelemetryPage /> : <AdditionalSourcesPage />}
    </div>
  );
}

function TelemetryPage(): React.ReactElement {
  return (
    <div data-test-subj="nightshiftOnboardingTelemetry">
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.nightshift.onboarding.telemetry.title', {
            defaultMessage: 'Add telemetry data',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <div data-test-subj="nightshiftOnboardingConnectors">
        <ConnectSourcesGrid group="telemetry" trailing={<AddDataCard />} />
      </div>
    </div>
  );
}

function AdditionalSourcesPage(): React.ReactElement {
  return (
    <div data-test-subj="nightshiftOnboardingAdditionalSources">
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.nightshift.onboarding.connectors.title', {
            defaultMessage: 'Connect other sources',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <div data-test-subj="nightshiftOnboardingConnectors">
        <ConnectSourcesGrid group="additional" />
      </div>
    </div>
  );
}
