/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useEffect, useRef, useState } from 'react';
import useEvent from 'react-use/lib/useEvent';
import type { ObservabilityOnboardingAppServices } from '../../..';
import type { OnboardingFlowEventContext } from '../../../../common/telemetry_events';
import { OBSERVABILITY_ONBOARDING_FLOW_PROGRESS_TELEMETRY_EVENT } from '../../../../common/telemetry_events';

interface Props {
  isActive: boolean;
  onboardingFlowType: string;
  onboardingId?: string;
  telemetryEventContext?: OnboardingFlowEventContext;
}

export function useWindowBlurDataMonitoringTrigger({
  isActive,
  onboardingFlowType,
  onboardingId,
  telemetryEventContext,
}: Props) {
  const [windowLostFocus, setWindowLostFocus] = useState(false);
  const telemetrySentRef = useRef(false);
  const telemetryEventContextRef = useRef(telemetryEventContext);
  const {
    services: { analytics },
  } = useKibana<ObservabilityOnboardingAppServices>();

  useEvent('blur', () => setWindowLostFocus(true), window);

  const isMonitoringData = isActive && windowLostFocus;

  useEffect(() => {
    telemetryEventContextRef.current = telemetryEventContext;
  }, [telemetryEventContext]);

  useEffect(() => {
    telemetrySentRef.current = false;
    setWindowLostFocus(false);
  }, [onboardingFlowType, onboardingId]);

  useEffect(() => {
    if (isMonitoringData && !telemetrySentRef.current) {
      telemetrySentRef.current = true;
      analytics?.reportEvent(OBSERVABILITY_ONBOARDING_FLOW_PROGRESS_TELEMETRY_EVENT.eventType, {
        onboardingFlowType,
        onboardingId,
        step: 'awaiting_data',
        context: telemetryEventContextRef.current,
      });
    }
  }, [analytics, isMonitoringData, onboardingFlowType, onboardingId]);

  return isMonitoringData;
}
