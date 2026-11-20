/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { PublicAppInfo } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { hasSeenData, storeHasData } from '@kbn/search-shared-ui';
import { hasGateHint, storeGateHint } from './gate_hint_storage';
import { INGEST_GATE_POLL_INTERVAL_MS, startIngestGate } from './start_ingest_gate';
import type { IngestGateHandle } from './start_ingest_gate';
import type { IngestGateScopeDeps } from './scope';

const APP_ROUTES: Record<string, string> = {
  searchHomepage: '/app/elasticsearch/home',
  integrations: '/app/integrations',
  discover: '/app/discover',
  home: '/app/home',
};

const esSpace: IngestGateScopeDeps = {
  spaces: {
    isSolutionViewEnabled: true,
    getActiveSpace: () => Promise.resolve({ solution: 'es' }),
  },
};

const observabilitySpace: IngestGateScopeDeps = {
  spaces: {
    isSolutionViewEnabled: true,
    getActiveSpace: () => Promise.resolve({ solution: 'oblt' }),
  },
};

describe('startIngestGate', () => {
  let handle: IngestGateHandle | undefined;

  const start = ({
    appId = 'discover',
    stage = 'noData',
    scope = esSpace,
  }: { appId?: string; stage?: string | Error; scope?: IngestGateScopeDeps } = {}) => {
    const core = coreMock.createStart();
    const currentAppId$ = new BehaviorSubject<string | undefined>(appId);
    const currentLocation$ = new BehaviorSubject<string>(APP_ROUTES[appId]);
    core.application.currentAppId$ = currentAppId$;
    core.application.currentLocation$ = currentLocation$;
    core.application.applications$ = new BehaviorSubject<ReadonlyMap<string, PublicAppInfo>>(
      new Map(
        Object.entries(APP_ROUTES).map(([id, appRoute]) => [id, { id, appRoute } as PublicAppInfo])
      )
    );
    core.application.getUrlForApp.mockImplementation((id) => APP_ROUTES[id]);
    const replaceLocation = jest.fn();
    core.http.anonymousPaths.isAnonymous.mockReturnValue(false);
    let currentStage = stage;
    core.http.get.mockImplementation(() =>
      currentStage instanceof Error
        ? Promise.reject(currentStage)
        : Promise.resolve({ stage: currentStage })
    );
    core.overlays.banners.add.mockReturnValue('back-control');

    handle = startIngestGate(core, scope, replaceLocation);

    return {
      core,
      replaceLocation,
      handle,
      setStage: (next: string) => {
        currentStage = next;
      },
      goTo: (nextAppId: string, location = APP_ROUTES[nextAppId]) => {
        currentAppId$.next(nextAppId);
        currentLocation$.next(location);
      },
    };
  };

  const flush = () => jest.advanceTimersByTimeAsync(0);

  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    handle?.stop();
    handle = undefined;
    jest.useRealTimers();
  });

  it('sends a page that adds no data to the home once the cluster says it is empty', async () => {
    const { core, replaceLocation } = start({ appId: 'discover' });

    expect(replaceLocation).not.toHaveBeenCalled();
    expect(core.chrome.setIsVisible).not.toHaveBeenCalled();

    await flush();

    expect(core.http.get).toHaveBeenCalledTimes(1);
    expect(replaceLocation).toHaveBeenCalledTimes(1);
    expect(replaceLocation).toHaveBeenCalledWith('/app/elasticsearch/home');
    expect(core.chrome.setIsVisible).toHaveBeenLastCalledWith(false);
    expect(hasGateHint('')).toBe(true);
  });

  it('leaves a deployment with data alone', async () => {
    const { core, replaceLocation } = start({ appId: 'discover', stage: 'hasData' });

    await flush();
    await jest.advanceTimersByTimeAsync(INGEST_GATE_POLL_INTERVAL_MS * 3);

    expect(core.http.get).toHaveBeenCalledTimes(1);
    expect(replaceLocation).not.toHaveBeenCalled();
    expect(core.chrome.setIsVisible).not.toHaveBeenCalled();
    expect(core.overlays.banners.add).not.toHaveBeenCalled();
    expect(hasSeenData()).toBe(true);
  });

  it('asks nothing when this browser has seen data', async () => {
    storeHasData(true);
    const { core, replaceLocation } = start({ appId: 'discover' });

    await flush();

    expect(core.http.get).not.toHaveBeenCalled();
    expect(replaceLocation).not.toHaveBeenCalled();
    expect(core.chrome.setIsVisible).not.toHaveBeenCalled();
  });

  it('does nothing outside the Elasticsearch solution', async () => {
    const { core, replaceLocation } = start({ appId: 'discover', scope: observabilitySpace });

    await flush();
    await jest.advanceTimersByTimeAsync(INGEST_GATE_POLL_INTERVAL_MS * 3);

    expect(core.http.get).not.toHaveBeenCalled();
    expect(replaceLocation).not.toHaveBeenCalled();
    expect(core.chrome.setIsVisible).not.toHaveBeenCalled();
    expect(core.overlays.banners.add).not.toHaveBeenCalled();
  });

  it('does nothing on pages that need no login', async () => {
    const core = coreMock.createStart();
    core.http.anonymousPaths.isAnonymous.mockReturnValue(true);

    handle = startIngestGate(core, esSpace);
    await flush();

    expect(core.http.get).not.toHaveBeenCalled();
    expect(core.chrome.setIsVisible).not.toHaveBeenCalled();
  });

  it('does not gate when the cluster state cannot be read', async () => {
    storeGateHint('', true);
    const { core, replaceLocation } = start({ appId: 'discover', stage: new Error('forbidden') });
    expect(core.chrome.setIsVisible).toHaveBeenLastCalledWith(false);

    await flush();

    expect(replaceLocation).not.toHaveBeenCalled();
    expect(core.chrome.setIsVisible).toHaveBeenLastCalledWith(true);
    expect(core.overlays.banners.add).not.toHaveBeenCalled();
    expect(hasGateHint('')).toBe(false);
  });

  it('hides the chrome from the first paint in a space this browser saw gated', async () => {
    storeGateHint('', true);
    const { core, replaceLocation } = start({ appId: 'integrations' });

    expect(core.chrome.setIsVisible).toHaveBeenCalledTimes(1);
    expect(core.chrome.setIsVisible).toHaveBeenCalledWith(false);
    expect(replaceLocation).not.toHaveBeenCalled();

    await flush();

    expect(core.chrome.setIsVisible).toHaveBeenCalledTimes(1);
  });

  it('shows the chrome again when the hint is wrong', async () => {
    storeGateHint('', true);
    const { core, replaceLocation } = start({ appId: 'discover', scope: observabilitySpace });

    await flush();

    expect(core.chrome.setIsVisible).toHaveBeenLastCalledWith(true);
    expect(replaceLocation).not.toHaveBeenCalled();
    expect(hasGateHint('')).toBe(false);
  });

  it('ignores a hint left for another space', () => {
    storeGateHint('/s/other', true);
    const { core } = start({ appId: 'integrations' });

    expect(core.chrome.setIsVisible).not.toHaveBeenCalled();
  });

  it('keeps an ingest page open without chrome, with a way back', async () => {
    const { core, replaceLocation } = start({ appId: 'integrations' });

    await flush();

    expect(replaceLocation).not.toHaveBeenCalled();
    expect(core.chrome.setIsVisible).toHaveBeenLastCalledWith(false);
    expect(core.overlays.banners.add).toHaveBeenCalledTimes(1);
  });

  it('offers no way back on the home itself', async () => {
    const { core, goTo } = start({ appId: 'integrations' });
    await flush();

    goTo('searchHomepage');

    expect(core.overlays.banners.remove).toHaveBeenCalledWith('back-control');
  });

  it('releases the gate when data arrives while on an ingest page', async () => {
    const { core, setStage, goTo, replaceLocation } = start({ appId: 'integrations' });
    await flush();

    setStage('hasData');
    await jest.advanceTimersByTimeAsync(INGEST_GATE_POLL_INTERVAL_MS);

    expect(core.chrome.setIsVisible).toHaveBeenLastCalledWith(true);
    expect(core.overlays.banners.remove).toHaveBeenCalledWith('back-control');
    expect(hasGateHint('')).toBe(false);
    expect(hasSeenData()).toBe(true);

    goTo('discover');
    await jest.advanceTimersByTimeAsync(INGEST_GATE_POLL_INTERVAL_MS * 3);

    expect(replaceLocation).not.toHaveBeenCalled();
    expect(core.http.get).toHaveBeenCalledTimes(2);
  });

  it('asks the cluster again before turning away a page opened since the last answer', async () => {
    const { core, setStage, goTo, replaceLocation } = start({ appId: 'integrations' });
    await flush();
    expect(core.http.get).toHaveBeenCalledTimes(1);

    setStage('hasData');
    goTo('discover');
    await flush();

    expect(core.http.get).toHaveBeenCalledTimes(2);
    expect(replaceLocation).not.toHaveBeenCalled();
    expect(core.chrome.setIsVisible).toHaveBeenLastCalledWith(true);
  });

  it('turns away a page opened later when the cluster is still empty', async () => {
    const { core, goTo, replaceLocation } = start({ appId: 'integrations' });
    await flush();

    goTo('discover');
    expect(replaceLocation).not.toHaveBeenCalled();
    await flush();

    expect(core.http.get).toHaveBeenCalledTimes(2);
    expect(replaceLocation).toHaveBeenCalledTimes(1);
  });

  it('turns away the rest of an app that is only partly allowed', async () => {
    const { goTo, replaceLocation } = start({ appId: 'integrations' });
    await flush();

    goTo('home', '/app/home#/tutorial_directory/sampleData');
    await flush();
    expect(replaceLocation).not.toHaveBeenCalled();

    goTo('home', '/app/home#/');
    await flush();
    expect(replaceLocation).toHaveBeenCalledTimes(1);
  });

  it('follows what the home reports without waiting for a poll', async () => {
    const { core, handle: started } = start({ appId: 'searchHomepage' });
    await flush();
    expect(core.chrome.setIsVisible).toHaveBeenLastCalledWith(false);

    started.reportHasData(true);

    expect(core.chrome.setIsVisible).toHaveBeenLastCalledWith(true);
  });

  it('gives the chrome back when stopped', async () => {
    const { core, handle: started } = start({ appId: 'integrations' });
    await flush();

    started.stop();

    expect(core.chrome.setIsVisible).toHaveBeenLastCalledWith(true);
    expect(core.overlays.banners.remove).toHaveBeenCalledWith('back-control');
  });
});
