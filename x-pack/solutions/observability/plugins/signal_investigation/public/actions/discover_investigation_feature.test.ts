/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { BehaviorSubject } from 'rxjs';
import { reportSignalInvestigationShown } from '../telemetry/shown_telemetry';
import { createDiscoverInvestigationFeature } from './discover_investigation_feature';

jest.mock('../telemetry/shown_telemetry', () => ({
  reportSignalInvestigationShown: jest.fn(),
}));

const reportShown = reportSignalInvestigationShown as jest.Mock;

const licensingWith = (platinum: boolean): LicensingPluginStart =>
  ({
    license$: new BehaviorSubject({ hasAtLeast: () => platinum }),
  } as unknown as LicensingPluginStart);

describe('createDiscoverInvestigationFeature', () => {
  beforeEach(() => {
    reportShown.mockClear();
  });

  it('reports the app menu once per Discover visit and again after leaving and returning', () => {
    const currentAppId$ = new BehaviorSubject<string | undefined>('discover');
    const feature = createDiscoverInvestigationFeature({
      licensing: licensingWith(true),
      openInvestigation: jest.fn(async () => {}),
      currentAppId$,
    });

    expect(feature.isAvailable()).toBe(true);
    expect(feature.isAvailable()).toBe(true);
    expect(reportShown).toHaveBeenCalledTimes(1);
    expect(reportShown).toHaveBeenCalledWith({ app: 'discover', surface: 'appMenu' });

    currentAppId$.next('dashboard');
    currentAppId$.next('discover');
    expect(feature.isAvailable()).toBe(true);
    expect(reportShown).toHaveBeenCalledTimes(2);
  });

  it('does not report the app menu below Platinum', () => {
    const feature = createDiscoverInvestigationFeature({
      licensing: licensingWith(false),
      openInvestigation: jest.fn(async () => {}),
      currentAppId$: new BehaviorSubject<string | undefined>('discover'),
    });

    expect(feature.isAvailable()).toBe(false);
    expect(feature.isAvailable()).toBe(false);
    expect(reportShown).not.toHaveBeenCalled();
  });
});
