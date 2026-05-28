/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useEffect, useState } from 'react';
import type { ObservabilityOnboardingAppServices } from '../../../..';
import {
  getDefaultFleetServerUrl,
  getEnrollmentTokenForPolicy,
  getOrCreateDefaultFleetAgentPolicy,
} from './fleet_managed_kubernetes_api';

export interface FleetManagedKubernetesState {
  isLoadingDefaults: boolean;
  error?: Error;
  fleetServerUrl: string;
  enrollmentToken: string;
  agentPolicyId?: string;
  setFleetServerUrl: (value: string) => void;
  setEnrollmentToken: (value: string) => void;
}

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

export const useFleetManagedKubernetesState = (): FleetManagedKubernetesState => {
  const {
    services: { http },
  } = useKibana<ObservabilityOnboardingAppServices>();

  const [isLoadingDefaults, setIsLoadingDefaults] = useState(true);
  const [error, setError] = useState<Error | undefined>();
  const [fleetServerUrl, setFleetServerUrl] = useState('');
  const [enrollmentToken, setEnrollmentToken] = useState('');
  const [agentPolicyId, setAgentPolicyId] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    setIsLoadingDefaults(true);

    const loadDefaults = async () => {
      let defaultsError: Error | undefined;

      try {
        const defaultFleetServerUrl = await getDefaultFleetServerUrl(http);
        if (!cancelled && defaultFleetServerUrl) {
          setFleetServerUrl(defaultFleetServerUrl);
        }
      } catch (loadError) {
        defaultsError = toError(loadError);
      }

      try {
        const policy = await getOrCreateDefaultFleetAgentPolicy(http);
        if (cancelled) {
          return;
        }

        setAgentPolicyId(policy.id);

        try {
          const token = await getEnrollmentTokenForPolicy(http, policy.id);
          if (!cancelled && token) {
            setEnrollmentToken(token);
          }
        } catch (tokenError) {
          defaultsError = toError(tokenError);
        }
      } catch (policyError) {
        defaultsError = toError(policyError);
      }

      if (!cancelled) {
        setError(defaultsError);
        setIsLoadingDefaults(false);
      }
    };

    void loadDefaults();

    return () => {
      cancelled = true;
    };
  }, [http]);

  return {
    isLoadingDefaults,
    error,
    fleetServerUrl,
    enrollmentToken,
    agentPolicyId,
    setFleetServerUrl,
    setEnrollmentToken,
  };
};
