/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMemoryHistory } from 'history';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { render } from '../utils/testing';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { Route } from '@kbn/shared-ux-router';
import { MONITORS_ROUTE, OVERVIEW_ROUTE } from '../../../../common/constants';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { SyntheticsUrlParams } from '../utils/url_params/get_supported_url_params';
import { getSupportedUrlParams } from '../utils/url_params/get_supported_url_params';
import { makeBaseBreadcrumb, useBreadcrumbs } from './use_breadcrumbs';
import { SyntheticsSettingsContext } from '../contexts';
import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { BehaviorSubject } from 'rxjs';
import type { ChromeStyle } from '@kbn/core-chrome-browser';

describe('useBreadcrumbs', () => {
  const expectedCrumbs: ChromeBreadcrumb[] = [
    {
      text: 'Crumb: ',
      'data-test-subj': 'http://href.example.net',
      href: 'http://href.example.net',
    },
    {
      text: 'Crumb II: Son of Crumb',
      'data-test-subj': 'http://href2.example.net',
      href: 'http://href2.example.net',
    },
  ];

  const renderAtRoute = (route: string, url: string = route) => {
    const { core, getBreadcrumbs } = createBreadcrumbsCore();

    const Component = () => {
      useBreadcrumbs(expectedCrumbs);
      return (
        <>
          {i18n.translate('app_not_found_in_i18nrc.component.helloLabel', {
            defaultMessage: 'Hello',
          })}
        </>
      );
    };

    render(
      <KibanaContextProvider services={{ ...core }}>
        <Route path={route}>
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
      { history: createMemoryHistory({ initialEntries: [url] }) }
    );

    return getBreadcrumbs;
  };

  const getSyntheticsCrumb = (breadcrumbs: ChromeBreadcrumb[]) =>
    breadcrumbs.find(
      (crumb) =>
        (crumb as { 'data-test-subj'?: string })['data-test-subj'] === 'syntheticsPathBreadcrumb'
    );

  it('sets the given breadcrumbs', () => {
    const getBreadcrumbs = renderAtRoute(MONITORS_ROUTE);

    const urlParams: SyntheticsUrlParams = getSupportedUrlParams({});
    expect(JSON.stringify(getBreadcrumbs())).toEqual(
      JSON.stringify(
        [
          { text: 'Observability', href: '/app/observability/overview' },
          ...makeBaseBreadcrumb('/app/synthetics', urlParams),
        ].concat(expectedCrumbs)
      )
    );
  });

  it('does not link the Synthetics crumb on the app root, where it would point at the current page', () => {
    const getBreadcrumbs = renderAtRoute(OVERVIEW_ROUTE);

    const syntheticsCrumb = getSyntheticsCrumb(getBreadcrumbs());

    expect(syntheticsCrumb).toBeDefined();
    expect(syntheticsCrumb?.href).toBeUndefined();
  });

  it('does not link the Synthetics crumb when the root has an empty pathname', () => {
    const getBreadcrumbs = renderAtRoute(OVERVIEW_ROUTE, '');

    const syntheticsCrumb = getSyntheticsCrumb(getBreadcrumbs());

    expect(syntheticsCrumb).toBeDefined();
    expect(syntheticsCrumb?.href).toBeUndefined();
  });
});

const createBreadcrumbsCore = (): {
  core: Pick<CoreStart, 'application' | 'chrome'>;
  getBreadcrumbs: () => ChromeBreadcrumb[];
} => {
  let breadcrumbObj: ChromeBreadcrumb[] = [];
  const defaultCoreMock = coreMock.createStart();

  return {
    getBreadcrumbs: () => breadcrumbObj,
    core: {
      application: {
        getUrlForApp: (app: string) =>
          app === 'synthetics' ? '/app/synthetics' : '/app/observability',
        navigateToUrl: jest.fn(),
      } as unknown as CoreStart['application'],
      chrome: {
        ...defaultCoreMock.chrome,
        getChromeStyle$: () => new BehaviorSubject<ChromeStyle>('classic').asObservable(),
        setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => {
          breadcrumbObj = newBreadcrumbs;
        },
      },
    },
  };
};
