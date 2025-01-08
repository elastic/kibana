/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ObservabilityOnboardingFlowStatus } from './get_onboarding_status';
import { OBSERVABILITY_ONBOARDING_AUTODETECT_TELEMETRY_EVENT } from '../../../../common/telemetry_events';

interface IntegrationFields {
  installSource: string;
  pkgName: string;
  pkgVersion: string;
  title: string;
}

export function useAutoDetectTelemetry(
  status: ObservabilityOnboardingFlowStatus,
  integrations: IntegrationFields[]
) {
  const [waitingMessageSent, setWaitingMessageSent] = useState(false);
  const [dataShippedMessageSent, setDataShippedMessageSent] = useState(false);
  const {
    services: { analytics },
  } = useKibana();

  useEffect(() => {
    if (status === 'awaitingData' && !waitingMessageSent) {
      analytics?.reportEvent(OBSERVABILITY_ONBOARDING_AUTODETECT_TELEMETRY_EVENT.eventType, {
        uses_legacy_onboarding_page: false,
        flow: 'auto_detect',
        step: 'awaiting_data',
        integrations,
      });
      setWaitingMessageSent(true);
    }
    if (status === 'dataReceived' && !dataShippedMessageSent) {
      analytics?.reportEvent(OBSERVABILITY_ONBOARDING_AUTODETECT_TELEMETRY_EVENT.eventType, {
        uses_legacy_onboarding_page: false,
        flow: 'auto_detect',
        step: 'data_shipped',
        integrations,
      });
      setDataShippedMessageSent(true);
    }
  }, [analytics, dataShippedMessageSent, integrations, status, waitingMessageSent]);
}
