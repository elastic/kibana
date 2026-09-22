/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { FC, PropsWithChildren } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { ProjectRoutingAccess, useCpsPickerAccess, useIsCpsMultiProject } from '@kbn/cps-utils';
import type { MlPluginStart } from '@kbn/ml-plugin/public';
import { withTimeout } from '@kbn/std';
import {
  OBSERVABILITY_INFRA_CPS_ENABLED_DEFAULT,
  OBSERVABILITY_INFRA_CPS_ENABLED_FEATURE_FLAG,
} from '../../common/cps_feature_flag';
import { LoadingPage } from '../components/loading_page';
import { getLogsAppRoutes } from '../pages/logs/routes';
import { useKibanaContextForPlugin } from './use_kibana';

type MlApi = NonNullable<MlPluginStart['mlApi']>;

const mlCpsCapabilityLoadingMessage = i18n.translate(
  'xpack.infra.logs.mlCpsCapabilityLoadingMessage',
  {
    defaultMessage: 'Loading Machine Learning configuration...',
  }
);

/**
 * Whether Elasticsearch supports ML cross-project search, as reported by the ML info API.
 * The default is `false` on purpose, so a consumer rendered outside `MlCpsCapabilityProvider`
 * behaves as capability-off — indistinguishable from non-CPS — rather than half-on.
 */
export const MlCpsCapabilityContext = createContext<boolean>(false);

// Outlasts the server-side ES client timeouts (30s per call), so when Elasticsearch is the
// slow part the route's own error resolves the promise first; this only fires when the
// request never settles at all, e.g. a wedged Kibana route or a silently stalled connection.
const ML_CPS_CAPABILITY_TIMEOUT_MS = 35_000;

// Fails closed: an unreachable, erroring, or unresponsive ML info API reads as capability-off.
const loadMlCpsCapability = async (mlApi: MlApi): Promise<boolean> => {
  try {
    const result = await withTimeout({
      promise: mlApi.mlInfo(),
      timeoutMs: ML_CPS_CAPABILITY_TIMEOUT_MS,
    });
    return result.timedout ? false : result.value.isMlCpsEnabled;
  } catch {
    return false;
  }
};

/**
 * Whether the current route is one of the Logs ML pages the capability applies to. The other
 * logs app routes (redirects, not-found) consume nothing behind the gate, so the provider
 * skips the capability fetch for them.
 */
const useIsOnMlCpsPage = (): boolean => {
  const { pathname } = useLocation();
  const { logsAnomalies, logsCategories } = getLogsAppRoutes();
  return matchPath(pathname, { path: [logsAnomalies.path, logsCategories.path] }) !== null;
};

/**
 * The feature flag, pricing tier, and CPS manager conditions of the Logs ML CPS gate —
 * everything that can be decided synchronously, before the ML server has been asked whether
 * Elasticsearch supports ML cross-project search.
 */
const useIsCpsPlatformGateEnabled = (): boolean => {
  const { services } = useKibanaContextForPlugin();

  const isCpsFeatureFlagEnabled = services.featureFlags.getBooleanValue(
    OBSERVABILITY_INFRA_CPS_ENABLED_FEATURE_FLAG,
    OBSERVABILITY_INFRA_CPS_ENABLED_DEFAULT
  );

  return Boolean(
    isCpsFeatureFlagEnabled && services.cps?.isTierEligible && services.cps?.cpsManager
  );
};

/**
 * Resolves whether Elasticsearch supports ML cross-project search and holds rendering on a
 * loading page until the answer is known, so everything below — including the log view state
 * machine, which captures its project routing when its actor is created — sees a settled
 * synchronous value. Deployments that fail the synchronous gate, and routes other than the
 * Logs ML pages (which consume nothing behind the gate), render immediately as capability-off
 * without issuing a request.
 */
export const MlCpsCapabilityProvider: FC<PropsWithChildren> = ({ children }) => {
  const { services } = useKibanaContextForPlugin();
  const isPlatformGateEnabled = useIsCpsPlatformGateEnabled();
  const isOnMlCpsPage = useIsOnMlCpsPage();
  const mlApi = services.ml?.mlApi;

  const [fetchedCapability, setFetchedCapability] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!isOnMlCpsPage || !isPlatformGateEnabled || !mlApi) {
      return;
    }

    let cancelled = false;
    loadMlCpsCapability(mlApi).then((capability) => {
      if (!cancelled) {
        setFetchedCapability(capability);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOnMlCpsPage, isPlatformGateEnabled, mlApi]);

  const capability = isOnMlCpsPage && isPlatformGateEnabled && mlApi ? fetchedCapability : false;

  if (capability === undefined) {
    return <LoadingPage message={mlCpsCapabilityLoadingMessage} />;
  }

  return (
    <MlCpsCapabilityContext.Provider value={capability}>{children}</MlCpsCapabilityContext.Provider>
  );
};

/**
 * Whether CPS project scope routing applies to the Logs ML apps. Single source of truth for the
 * gate: the infra CPS feature flag, tier eligibility, CPS manager availability, and the ML
 * cross-project search capability of Elasticsearch. The last condition is read from
 * `MlCpsCapabilityContext`, so consumers must sit under `MlCpsCapabilityProvider`. Gates
 * behaviour only — scope UI should render behind `useShouldRenderInfraMlCpsUi`, which
 * additionally waits for linked projects count.
 */
export const useIsInfraMlCpsEnabled = (): boolean => {
  const isPlatformGateEnabled = useIsCpsPlatformGateEnabled();
  const isMlCpsCapabilityEnabled = useContext(MlCpsCapabilityContext);

  return isPlatformGateEnabled && isMlCpsCapabilityEnabled;
};

/**
 * Whether the Logs ML apps should render CPS project scope UI. `true` once CPS is enabled with at
 * least one linked project, `false` once it is disabled or conclusively single-project (where scope
 * says nothing), and `undefined` while readiness is pending. Prefer rendering a loading state over
 * nothing then, so the answer arriving does not shift the layout. Only gate rendering UI with this.
 * Behaviour that must apply regardless of linked projects belongs behind `useIsInfraMlCpsEnabled`.
 */
export const useShouldRenderInfraMlCpsUi = (): boolean | undefined => {
  const { services } = useKibanaContextForPlugin();
  const isCpsEnabled = useIsInfraMlCpsEnabled();
  const isCpsMultiProject = useIsCpsMultiProject(services.cps?.cpsManager);

  return isCpsEnabled ? isCpsMultiProject : false;
};

/**
 * Registers the global project picker access for the logs app: read-only when the Logs ML CPS
 * gate holds — scope is a per-job property on these pages, so the picker only displays the
 * default scope — and hidden otherwise. Re-registering when the gate value settles makes the
 * CPS manager re-apply the access immediately for the active app, so this must render under
 * `MlCpsCapabilityProvider` where the gate is already settled.
 */
export const useInfraMlCpsPickerAccess = (): void => {
  const {
    services: { application, cps },
  } = useKibanaContextForPlugin();
  const isCpsEnabled = useIsInfraMlCpsEnabled();

  const pickerAccessResolver = useCallback(
    () => (isCpsEnabled ? ProjectRoutingAccess.READONLY : ProjectRoutingAccess.DISABLED),
    [isCpsEnabled]
  );

  useCpsPickerAccess({
    resolver: pickerAccessResolver,
    currentAppId$: application.currentAppId$,
    cpsManager: cps?.cpsManager,
  });
};
