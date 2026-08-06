/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createMemoryHistory } from 'history';
import { BehaviorSubject } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import type { ChromeStyle } from '@kbn/core-chrome-browser';
import { Route } from '@kbn/shared-ux-router';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { render } from '../../utils/testing';
import { SyntheticsSettingsContext } from '../../contexts';
import { MONITOR_EDIT_ROUTE } from '../../../../../common/constants';
import { useMonitorAddEditBreadcrumbs } from './use_breadcrumbs';

describe('useMonitorAddEditBreadcrumbs', () => {
  const renderEditRoute = ({
    loadedMonitorId,
    routeMonitorId,
    locationId,
    remoteName,
    monitorNotFound,
  }: {
    loadedMonitorId?: string;
    routeMonitorId: string;
    locationId?: string;
    remoteName?: string;
    monitorNotFound?: boolean;
  }) => {
    const [getBreadcrumbs, core] = mockCore();

    const Component = () => {
      useMonitorAddEditBreadcrumbs(true, { monitorNotFound });
      return null;
    };

    render(
      <KibanaContextProvider services={{ ...core }}>
        <Route path={MONITOR_EDIT_ROUTE}>
          <SyntheticsSettingsContext.Provider
            value={{
              darkMode: false,
              basePath: '/app/synthetics',
              canSave: true,
              dateRangeStart: '',
              dateRangeEnd: '',
              isApmAvailable: true,
              setBreadcrumbs: core.chrome.setBreadcrumbs,
              isInfraAvailable: false,
              isLogsAvailable: false,
              canManagePrivateLocations: false,
            }}
          >
            <Component />
          </SyntheticsSettingsContext.Provider>
        </Route>
      </KibanaContextProvider>,
      {
        history: createMemoryHistory({
          initialEntries: [
            (() => {
              const search = new URLSearchParams({
                ...(locationId ? { locationId } : {}),
                ...(remoteName ? { remoteName } : {}),
              }).toString();

              return `/edit-monitor/${routeMonitorId}${search ? `?${search}` : ''}`;
            })(),
          ],
        }),
        state: loadedMonitorId
          ? {
              monitorDetails: {
                syntheticsMonitor: {
                  config_id: loadedMonitorId,
                  name: `Monitor ${loadedMonitorId}`,
                },
              },
            }
          : undefined,
      }
    );

    return () => getBreadcrumbs().map(({ text, href }) => ({ text, href }));
  };

  it('links the monitor being edited when the loaded monitor matches the route', () => {
    const getCrumbs = renderEditRoute({
      loadedMonitorId: 'monitor-a',
      routeMonitorId: 'monitor-a',
    });

    expect(getCrumbs()).toEqual(
      expect.arrayContaining([
        { text: 'Monitor monitor-a', href: '/app/synthetics/monitor/monitor-a' },
        { text: 'Edit monitor', href: undefined },
      ])
    );
  });

  it('preserves locationId and remoteName in the monitor crumb href', () => {
    const getCrumbs = renderEditRoute({
      loadedMonitorId: 'monitor-a',
      routeMonitorId: 'monitor-a',
      locationId: 'location-1',
      remoteName: 'remote-ccs',
    });

    expect(getCrumbs()).toEqual(
      expect.arrayContaining([
        {
          text: 'Monitor monitor-a',
          href: '/app/synthetics/monitor/monitor-a?locationId=location-1&remoteName=remote-ccs',
        },
      ])
    );
  });

  it('omits the monitor crumb while the store still holds the previously edited monitor', () => {
    const getCrumbs = renderEditRoute({
      loadedMonitorId: 'monitor-a',
      routeMonitorId: 'monitor-b',
    });

    const crumbs = getCrumbs();

    expect(crumbs).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ text: 'Monitor monitor-a' })])
    );
    expect(crumbs[crumbs.length - 1]).toEqual({ text: 'Edit monitor', href: undefined });
  });

  it('ends the trail with "Monitor not found" when the monitor could not be loaded', () => {
    const getCrumbs = renderEditRoute({ routeMonitorId: 'monitor-b', monitorNotFound: true });

    const crumbs = getCrumbs();

    expect(crumbs[crumbs.length - 1]).toEqual({ text: 'Monitor not found', href: undefined });
    expect(crumbs).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ text: 'Edit monitor' })])
    );
  });
});

const mockCore: () => [() => ChromeBreadcrumb[], any] = () => {
  let breadcrumbs: ChromeBreadcrumb[] = [];
  const defaultCoreMock = coreMock.createStart();

  const core = {
    application: {
      getUrlForApp: (app: string) =>
        app === 'synthetics' ? '/app/synthetics' : '/app/observability',
      navigateToUrl: jest.fn(),
    },
    chrome: {
      ...defaultCoreMock.chrome,
      getChromeStyle$: () => new BehaviorSubject<ChromeStyle>('classic').asObservable(),
      setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => {
        breadcrumbs = newBreadcrumbs;
      },
    },
  };

  return [() => breadcrumbs, core];
};
