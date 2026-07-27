/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subject } from 'rxjs';
import type { App, AppDeepLink, ApplicationStart, AppUpdater } from '@kbn/core/public';
import { AppStatus, type PricingServiceStart } from '@kbn/core/public';
import { casesFeatureId } from '../../common';
import { updateGlobalNavigation } from './update_global_navigation';

// Used in updater callback
const app = {} as unknown as App;

const createPricing = (completeOverviewEnabled: boolean): PricingServiceStart =>
  ({
    isFeatureAvailable: (featureId: string) =>
      featureId === 'observability:complete_overview' ? completeOverviewEnabled : false,
  } as unknown as PricingServiceStart);

const pricing = createPricing(true);

const noObservabilityCapabilities = {
  logs: { show: false },
  observabilityAlerts: { show: false },
  navLinks: { apm: false, logs: false, metrics: false, uptime: false },
} as unknown as ApplicationStart['capabilities'];

describe('updateGlobalNavigation', () => {
  describe('when no observability apps are enabled', () => {
    it('hides the overview link and marks the app inaccessible', () => {
      const capabilities = {
        [casesFeatureId]: { read_cases: false },
        ...noObservabilityCapabilities,
      } as unknown as ApplicationStart['capabilities'];
      const deepLinks: AppDeepLink[] = [];
      const callback = jest.fn();
      const updater$ = {
        next: (cb: AppUpdater) => callback(cb(app)),
      } as unknown as Subject<AppUpdater>;

      updateGlobalNavigation({ capabilities, deepLinks, updater$, pricing });

      expect(callback).toHaveBeenCalledWith({
        deepLinks: [],
        status: AppStatus.inaccessible,
        visibleIn: [],
      });
    });

    it('marks the app inaccessible when casesFeatureId is absent from capabilities', () => {
      const callback = jest.fn();
      const updater$ = {
        next: (cb: AppUpdater) => callback(cb(app)),
      } as unknown as Subject<AppUpdater>;

      updateGlobalNavigation({
        capabilities: noObservabilityCapabilities,
        deepLinks: [],
        updater$,
        pricing,
      });

      expect(callback).toHaveBeenCalledWith({
        deepLinks: [],
        status: AppStatus.inaccessible,
        visibleIn: [],
      });
    });

    it('marks the app inaccessible on non-complete-overview tiers without capabilities', () => {
      const capabilities = {
        [casesFeatureId]: { read_cases: false },
        ...noObservabilityCapabilities,
      } as unknown as ApplicationStart['capabilities'];
      const callback = jest.fn();
      const updater$ = {
        next: (cb: AppUpdater) => callback(cb(app)),
      } as unknown as Subject<AppUpdater>;

      updateGlobalNavigation({
        capabilities,
        deepLinks: [{ id: 'alerts', title: 'Alerts', order: 8001, path: '/alerts', visibleIn: [] }],
        updater$,
        pricing: createPricing(false),
      });

      expect(callback).toHaveBeenCalledWith({
        deepLinks: [],
        status: AppStatus.inaccessible,
        visibleIn: [],
      });
    });

    it('keeps the app accessible when only cases privileges are granted', () => {
      const capabilities = {
        [casesFeatureId]: { read_cases: true },
        ...noObservabilityCapabilities,
      } as unknown as ApplicationStart['capabilities'];

      const caseRoute = {
        id: 'cases',
        title: 'Cases',
        order: 8003,
        path: '/cases',
        visibleIn: [],
      };

      const deepLinks = [
        caseRoute,
        { id: 'alerts', title: 'Alerts', order: 8001, path: '/alerts', visibleIn: [] },
        { id: 'rules', title: 'Rules', order: 8002, path: '/rules', visibleIn: [] },
      ];
      const callback = jest.fn();
      const updater$ = {
        next: (cb: AppUpdater) => callback(cb(app)),
      } as unknown as Subject<AppUpdater>;

      updateGlobalNavigation({ capabilities, deepLinks, updater$, pricing });

      expect(callback).toHaveBeenCalledWith({
        deepLinks: [
          {
            ...caseRoute,
            visibleIn: ['classicSideNav', 'projectSideNav', 'globalSearch'],
          },
        ],
        status: AppStatus.accessible,
        // Cases-only access does not surface the overview app or alerts/rules nav
        visibleIn: [],
      });
    });
  });

  describe('when one observability app is enabled', () => {
    it('shows the overview link', () => {
      const capabilities = {
        logs: { show: true },
        navLinks: { apm: true, logs: false, metrics: false, uptime: false },
      } as unknown as ApplicationStart['capabilities'];
      const deepLinks: AppDeepLink[] = [];
      const callback = jest.fn();
      const updater$ = {
        next: (cb: AppUpdater) => callback(cb(app)),
      } as unknown as Subject<AppUpdater>;

      updateGlobalNavigation({ capabilities, deepLinks, updater$, pricing });

      expect(callback).toHaveBeenCalledWith({
        deepLinks,
        status: AppStatus.accessible,
        visibleIn: ['classicSideNav', 'projectSideNav', 'home', 'kibanaOverview', 'globalSearch'],
      });
    });

    describe('when cases are enabled', () => {
      it('shows the cases deep link', () => {
        const capabilities = {
          [casesFeatureId]: { read_cases: true },
          logs: { show: true },
          navLinks: { apm: true, logs: false, metrics: false, uptime: false },
        } as unknown as ApplicationStart['capabilities'];

        const caseRoute = {
          id: 'cases',
          title: 'Cases',
          order: 8003,
          path: '/cases',
          visibleIn: [], // no visibility set
        };

        const deepLinks = [caseRoute];

        const callback = jest.fn();
        const updater$ = {
          next: (cb: AppUpdater) => callback(cb(app)),
        } as unknown as Subject<AppUpdater>;

        updateGlobalNavigation({ capabilities, deepLinks, updater$, pricing });

        expect(callback).toHaveBeenCalledWith({
          deepLinks: [
            {
              ...caseRoute,
              visibleIn: ['classicSideNav', 'projectSideNav', 'globalSearch'], // visibility set
            },
          ],
          status: AppStatus.accessible,
          visibleIn: ['classicSideNav', 'projectSideNav', 'home', 'kibanaOverview', 'globalSearch'],
        });
      });
    });

    describe('with no case read capabilities', () => {
      it('hides the cases deep link', () => {
        const capabilities = {
          [casesFeatureId]: { read_cases: false },
          logs: { show: true },
          navLinks: { apm: true, logs: false, metrics: false, uptime: false },
        } as unknown as ApplicationStart['capabilities'];

        const caseRoute = {
          id: 'cases',
          title: 'Cases',
          order: 8003,
          path: '/cases',
          visibleIn: [],
        };

        const deepLinks = [caseRoute];

        const callback = jest.fn();
        const updater$ = {
          next: (cb: AppUpdater) => callback(cb(app)),
        } as unknown as Subject<AppUpdater>;

        updateGlobalNavigation({ capabilities, deepLinks, updater$, pricing });

        expect(callback).toHaveBeenCalledWith({
          deepLinks: [], // Deeplink has been filtered out
          status: AppStatus.accessible,
          visibleIn: ['classicSideNav', 'projectSideNav', 'home', 'kibanaOverview', 'globalSearch'],
        });
      });
    });

    describe('when only observabilityAlerts privilege is granted', () => {
      it('shows the alerts deep link', () => {
        const capabilities = {
          logs: { show: false },
          observabilityAlerts: { show: true },
          navLinks: { apm: false, logs: false, metrics: false, uptime: false },
        } as unknown as ApplicationStart['capabilities'];

        const deepLinks = [
          {
            id: 'alerts',
            title: 'Alerts',
            order: 8001,
            path: '/alerts',
            visibleIn: [],
          },
        ];
        const callback = jest.fn();
        const updater$ = {
          next: (cb: AppUpdater) => callback(cb(app)),
        } as unknown as Subject<AppUpdater>;

        updateGlobalNavigation({ capabilities, deepLinks, updater$, pricing });

        expect(callback).toHaveBeenCalledWith({
          deepLinks: [
            {
              id: 'alerts',
              title: 'Alerts',
              order: 8001,
              path: '/alerts',
              visibleIn: ['classicSideNav', 'projectSideNav', 'globalSearch'],
            },
          ],
          status: AppStatus.accessible,
          visibleIn: ['classicSideNav', 'projectSideNav', 'home', 'kibanaOverview', 'globalSearch'],
        });
      });
    });

    describe('when alerts are enabled', () => {
      it('shows the alerts deep link', () => {
        const capabilities = {
          [casesFeatureId]: { read_cases: true },
          logs: { show: true },
          navLinks: { apm: true, logs: false, metrics: false, uptime: false },
        } as unknown as ApplicationStart['capabilities'];

        const deepLinks = [
          {
            id: 'alerts',
            title: 'Alerts',
            order: 8001,
            path: '/alerts',
            visibleIn: [],
          },
        ];
        const callback = jest.fn();
        const updater$ = {
          next: (cb: AppUpdater) => callback(cb(app)),
        } as unknown as Subject<AppUpdater>;

        updateGlobalNavigation({ capabilities, deepLinks, updater$, pricing });

        expect(callback).toHaveBeenCalledWith({
          deepLinks: [
            {
              id: 'alerts',
              title: 'Alerts',
              order: 8001,
              path: '/alerts',
              visibleIn: ['classicSideNav', 'projectSideNav', 'globalSearch'],
            },
          ],
          status: AppStatus.accessible,
          visibleIn: ['classicSideNav', 'projectSideNav', 'home', 'kibanaOverview', 'globalSearch'],
        });
      });

      it('shows the alerts deep link for logs', () => {
        const capabilities = {
          [casesFeatureId]: { read_cases: true },
          logs: { show: true },
          navLinks: { apm: false, logs: false, metrics: false, uptime: false },
        } as unknown as ApplicationStart['capabilities'];

        const deepLinks = [
          {
            id: 'alerts',
            title: 'Alerts',
            order: 8001,
            path: '/alerts',
            visibleIn: [],
          },
        ];
        const callback = jest.fn();
        const updater$ = {
          next: (cb: AppUpdater) => callback(cb(app)),
        } as unknown as Subject<AppUpdater>;

        updateGlobalNavigation({ capabilities, deepLinks, updater$, pricing });

        expect(callback).toHaveBeenCalledWith({
          deepLinks: [
            {
              id: 'alerts',
              title: 'Alerts',
              order: 8001,
              path: '/alerts',
              visibleIn: ['classicSideNav', 'projectSideNav', 'globalSearch'],
            },
          ],
          status: AppStatus.accessible,
          visibleIn: ['classicSideNav', 'projectSideNav', 'home', 'kibanaOverview', 'globalSearch'],
        });
      });
    });
  });
});
