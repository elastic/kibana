/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useInterval from 'react-use/lib/useInterval';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useAsync from 'react-use/lib/useAsync';
import { type AssetSOObject, type GetBulkAssetsResponse } from '@kbn/fleet-plugin/common';
import { useEffect, useState } from 'react';
import { OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT } from '../../../../common/telemetry_events';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { getOnboardingStatus } from './get_onboarding_status';
import { getInstalledIntegrations } from './get_installed_integrations';
import { type ObservabilityOnboardingContextValue } from '../../../plugin';

export const DASHBOARDS = {
  'apache-Logs-Apache-Dashboard': { type: 'logs' },
  'docker-AV4REOpp5NkDleZmzKkE': { type: 'metrics' },
  'nginx-55a9e6e0-a29e-11e7-928f-5dbe6f6f5519': { type: 'logs' },
  'system-79ffd6e0-faa0-11e6-947f-177f697178b8': { type: 'metrics' },
  'mysql-Logs-MySQL-Dashboard': { type: 'logs' },
  'postgresql-158be870-87f4-11e7-ad9c-db80de0bf8d3': { type: 'logs' },
  'redis-7fea2930-478e-11e7-b1f0-cb29bac6bf8b': { type: 'logs' },
  'haproxy-3560d580-aa34-11e8-9c06-877f0445e3e0': { type: 'logs' },
  'rabbitmq-AV4YobKIge1VCbKU_qVo': { type: 'metrics' },
  'kafka-943caca0-87ee-11e7-ad9c-db80de0bf8d3': { type: 'logs' },
  'apache_tomcat-8fd54a20-1f0d-11ee-9d6b-bb41d08322c8': { type: 'logs' },
  'mongodb-abcf35b0-0a82-11e8-bffe-ff7d4f68cf94': { type: 'logs' },
  'prometheus-c181a040-3d96-11ed-b624-b12467b8df74': { type: 'metrics' },
};

export function useOnboardingFlow() {
  const {
    services: { fleet, analytics },
  } = useKibana<ObservabilityOnboardingContextValue>();
  const [dataReceivedTelemetrySent, setDataReceivedTelemetrySent] = useState(false);

  // Create onboarding session
  const { data, error, refetch } = useFetcher(
    (callApi) =>
      callApi('POST /internal/observability_onboarding/flow', {
        params: {
          body: {
            name: 'auto-detect',
          },
        },
      }),
    [],
    { showToastOnError: false }
  );

  const onboardingId = data?.onboardingFlow.id;

  // Fetch onboarding progress
  const {
    data: progressData,
    status: progressStatus,
    refetch: refetchProgress,
  } = useFetcher(
    (callApi) => {
      if (onboardingId) {
        return callApi('GET /internal/observability_onboarding/flow/{onboardingId}/progress', {
          params: { path: { onboardingId } },
        });
      }
    },
    [onboardingId]
  );

  const status = getOnboardingStatus(progressData);
  const installedIntegrations = getInstalledIntegrations(progressData);

  // Fetch metadata for installed Kibana assets
  const assetsState = useAsync(async () => {
    if (installedIntegrations.length === 0) {
      return [];
    }
    const assetsMetadata = await fleet.hooks.epm.getBulkAssets({
      assetIds: (
        installedIntegrations
          .map((integration) => integration.kibanaAssets)
          .flat() as AssetSOObject[]
      ).filter((asset) => Object.keys(DASHBOARDS).includes(asset.id)),
    });
    return installedIntegrations.map((integration) => {
      return {
        ...integration,
        // Enrich installed Kibana assets with metadata from Fleet API (e.g. title, description, etc.)
        kibanaAssets: integration.kibanaAssets.reduce<GetBulkAssetsResponse['items']>(
          (acc, asset) => {
            const assetWithMetadata = assetsMetadata.data?.items.find(({ id }) => id === asset.id);
            if (assetWithMetadata) {
              acc.push(assetWithMetadata);
            }
            return acc;
          },
          []
        ),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installedIntegrations.length]);

  useInterval(
    refetchProgress,
    progressStatus === FETCH_STATUS.SUCCESS && status !== 'dataReceived' ? 3000 : null
  );

  useEffect(() => {
    if (status === 'dataReceived' && !dataReceivedTelemetrySent) {
      setDataReceivedTelemetrySent(true);
      analytics.reportEvent(OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT.eventType, {
        flow_type: 'autoDetect',
        flow_id: onboardingId,
        step: 'logs-ingest',
        step_status: 'complete',
      });
    }
  }, [analytics, dataReceivedTelemetrySent, onboardingId, status]);

  return {
    data,
    error,
    refetch,
    status,
    installedIntegrations: assetsState.value ?? [],
  };
}
