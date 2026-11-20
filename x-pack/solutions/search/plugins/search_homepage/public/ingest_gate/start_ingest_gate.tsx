/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { combineLatest } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { hasSeenData, storeHasData } from '@kbn/search-shared-ui';
import { PLUGIN_ID } from '../../common';
import { ANALYTICS_CLUSTER_STATE_PATH } from '../../common/analytics';
import type { AnalyticsClusterState } from '../../common/analytics';
import { isAllowedWhileGated, needsWayBack } from './allowlist';
import type { GateLocation } from './allowlist';
import { BackToAddData } from './back_to_add_data';
import { hasGateHint, storeGateHint } from './gate_hint_storage';
import { createIngestGate } from './ingest_gate';
import { isElasticsearchSolutionActive } from './scope';
import type { IngestGateScopeDeps } from './scope';

export const INGEST_GATE_POLL_INTERVAL_MS = 15_000;

export interface IngestGateHandle {
  /** Passes on what a page learned from the cluster, so the gate follows it at once. */
  reportHasData: (hasData: boolean) => void;
  stop: () => void;
}

const INACTIVE_GATE: IngestGateHandle = { reportHasData: () => {}, stop: () => {} };

/**
 * While the Elasticsearch solution holds no data: keeps the Kibana chrome hidden on every page,
 * sends pages that do not add data back to the home, and offers a way back from those that do.
 */
export const startIngestGate = (
  core: CoreStart,
  scopeDeps: IngestGateScopeDeps,
  replaceLocation: (url: string) => void = (url) => window.location.replace(url)
): IngestGateHandle => {
  const { application, chrome, http, notifications, overlays } = core;
  if (http.anonymousPaths.isAnonymous(window.location.pathname)) {
    return INACTIVE_GATE;
  }

  const basePath = http.basePath.get();
  const hasSeenDataBefore = hasSeenData();
  // The cluster has not answered at first paint, so the chrome follows what this browser saw last.
  const isHinted = !hasSeenDataBefore && hasGateHint(basePath);

  let gateLocation: GateLocation | undefined;
  let locationVersion = 0;
  let checkedLocationVersion = -1;
  let isRechecking = false;
  let isChromeHidden = false;
  let isStopped = false;
  let isTurningAway = false;
  let backControlId: string | undefined;

  const setChromeHidden = (isHidden: boolean): void => {
    if (isHidden === isChromeHidden) {
      return;
    }
    isChromeHidden = isHidden;
    chrome.setIsVisible(!isHidden);
  };

  // An app that is turned away while it starts can go on writing its state to the URL and raising
  // errors after it is unmounted, so it is left behind by loading the home afresh.
  const turnAway = (): void => {
    if (!isTurningAway) {
      isTurningAway = true;
      replaceLocation(application.getUrlForApp(PLUGIN_ID));
    }
  };

  const goHome = (): void => {
    application.navigateToApp(PLUGIN_ID).catch((error: Error) => {
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.searchHomepage.ingestGate.navigationErrorTitle', {
          defaultMessage: 'Unable to open the home page',
        }),
      });
    });
  };

  const setBackControlShown = (isShown: boolean): void => {
    if (isShown && backControlId === undefined) {
      backControlId = overlays.banners.add(toMountPoint(<BackToAddData onClick={goHome} />, core));
    } else if (!isShown && backControlId !== undefined) {
      overlays.banners.remove(backControlId);
      backControlId = undefined;
    }
  };

  setChromeHidden(isHinted);

  const gate = createIngestGate({
    isInScope: () => isElasticsearchSolutionActive(scopeDeps),
    fetchHasData: async () => {
      const version = locationVersion;
      const { stage } = await http.get<AnalyticsClusterState>(ANALYTICS_CLUSTER_STATE_PATH);
      const hasData = stage !== 'noData';
      checkedLocationVersion = version;
      storeHasData(hasData);
      return hasData;
    },
    hasSeenData: hasSeenDataBefore,
    pollIntervalMs: INGEST_GATE_POLL_INTERVAL_MS,
    isPageVisible: () => document.visibilityState === 'visible',
  });

  const enforce = (): void => {
    if (isStopped) {
      return;
    }
    const status = gate.getStatus();
    setChromeHidden(status === 'gated' || (status === 'unknown' && isHinted));
    if (status !== 'unknown') {
      storeGateHint(basePath, status === 'gated');
    }

    const gatedLocation = status === 'gated' ? gateLocation : undefined;
    setBackControlShown(gatedLocation !== undefined && needsWayBack(gatedLocation));
    if (gatedLocation === undefined || isAllowedWhileGated(gatedLocation)) {
      return;
    }
    // Data can arrive between polls, on a page that then links onwards, so a page is only turned
    // away on an answer the cluster gave after it was opened.
    if (checkedLocationVersion === locationVersion) {
      turnAway();
      return;
    }
    if (!isRechecking) {
      isRechecking = true;
      gate.recheck().finally(() => {
        isRechecking = false;
        enforce();
      });
    }
  };

  const subscription = combineLatest([
    application.currentAppId$,
    application.currentLocation$,
    application.applications$,
  ]).subscribe(([appId, location, applications]) => {
    const app = appId === undefined ? undefined : applications.get(appId);
    const next: GateLocation = {
      appId,
      isChromeless: app?.chromeless === true,
      appRoute: app?.appRoute,
      location: http.basePath.remove(location),
    };
    if (
      gateLocation === undefined ||
      next.appId !== gateLocation.appId ||
      next.location !== gateLocation.location
    ) {
      locationVersion++;
    }
    gateLocation = next;
    enforce();
  });
  subscription.add(gate.status$.subscribe(enforce));

  return {
    reportHasData: gate.reportHasData,
    stop: () => {
      isStopped = true;
      subscription.unsubscribe();
      gate.stop();
      setBackControlShown(false);
      setChromeHidden(false);
    },
  };
};
