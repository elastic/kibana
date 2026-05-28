/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ObservabilityOnboardingAppServices } from '../../../..';
import {
  buildManagedKubernetesManifestDownloadHref,
  getDefaultFleetServerUrl,
  getEnrollmentTokenForPolicy,
  getManagedKubernetesManifest,
  getOrCreateDefaultFleetAgentPolicy,
} from './fleet_managed_kubernetes_api';

export interface FleetManagedKubernetesState {
  isLoadingDefaults: boolean;
  isLoadingManifest: boolean;
  error?: Error;
  fleetServerUrl: string;
  enrollmentToken: string;
  agentPolicyId?: string;
  manifest?: string;
  downloadHref?: string;
  setFleetServerUrl: (value: string) => void;
  setEnrollmentToken: (value: string) => void;
  refreshManifest: () => void;
}

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

export const useFleetManagedKubernetesState = (): FleetManagedKubernetesState => {
  const {
    services: { http },
  } = useKibana<ObservabilityOnboardingAppServices>();

  const [isLoadingDefaults, setIsLoadingDefaults] = useState(true);
  const [isLoadingManifest, setIsLoadingManifest] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const [fleetServerUrl, setFleetServerUrl] = useState('');
  const [enrollmentToken, setEnrollmentToken] = useState('');
  const [agentPolicyId, setAgentPolicyId] = useState<string | undefined>();
  const [manifest, setManifest] = useState<string | undefined>();
  const [downloadHref, setDownloadHref] = useState<string | undefined>();
  const [manifestRefreshKey, setManifestRefreshKey] = useState(0);
  const hasManifestErrorRef = useRef(false);

  const refreshManifest = useCallback(() => {
    setManifestRefreshKey((key) => key + 1);
  }, []);

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
        hasManifestErrorRef.current = false;
        setError(defaultsError);
        setIsLoadingDefaults(false);
      }
    };

    void loadDefaults();

    return () => {
      cancelled = true;
    };
  }, [http]);

  useEffect(() => {
    if (!fleetServerUrl || !enrollmentToken) {
      setManifest(undefined);
      setDownloadHref(undefined);
      setIsLoadingManifest(false);
      if (!isLoadingDefaults && hasManifestErrorRef.current) {
        hasManifestErrorRef.current = false;
        setError(undefined);
      }
      return;
    }

    let cancelled = false;
    setIsLoadingManifest(true);

    const loadManifest = async () => {
      try {
        const manifestText = await getManagedKubernetesManifest(http, {
          fleetServerUrl,
          enrollmentToken,
        });

        if (cancelled) {
          return;
        }

        hasManifestErrorRef.current = false;
        setError(undefined);
        setManifest(manifestText);
        setDownloadHref(
          buildManagedKubernetesManifestDownloadHref(http, {
            fleetServerUrl,
            enrollmentToken,
          })
        );
      } catch (manifestError) {
        if (!cancelled) {
          hasManifestErrorRef.current = true;
          setManifest(undefined);
          setDownloadHref(undefined);
          setError(toError(manifestError));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingManifest(false);
        }
      }
    };

    void loadManifest();

    return () => {
      cancelled = true;
    };
  }, [http, fleetServerUrl, enrollmentToken, manifestRefreshKey, isLoadingDefaults]);

  return {
    isLoadingDefaults,
    isLoadingManifest,
    error,
    fleetServerUrl,
    enrollmentToken,
    agentPolicyId,
    manifest,
    downloadHref,
    setFleetServerUrl,
    setEnrollmentToken,
    refreshManifest,
  };
};
