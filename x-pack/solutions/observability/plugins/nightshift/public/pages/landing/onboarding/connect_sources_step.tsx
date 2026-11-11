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
  isAdditionalType,
} from '../../../components/entities/sandbox_connector/connect_sources_grid';

export const CONNECT_SOURCES_TITLE = i18n.translate(
  'xpack.nightshift.onboarding.connectSources.title',
  { defaultMessage: 'Connect other sources' }
);

/** The optional "Connect other sources" step: the other sandbox-capable connector types. */
export function OnboardingConnectSourcesStep(): React.ReactElement {
  return (
    <div data-test-subj="nightshiftOnboardingConnectSourcesStep">
      <ConnectSourcesGrid filter={isAdditionalType} />
    </div>
  );
}
