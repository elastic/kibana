/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DigitalExperienceStartDeps } from '../types';
import { AppPageTemplate } from './app_page_template';
import { SideNavProvider, useHideSideNav } from './side_nav_context';

jest.mock('@kbn/typed-react-router-config', () => ({ RouteRenderer: () => null }));

const mockChrome = {
  getChromeStyle: jest.fn(() => 'classic'),
  sideNav: { getIsCollapsed: jest.fn(() => false), setIsCollapsed: jest.fn() },
};
jest.mock('../hooks/use_kibana_services', () => ({
  useKibanaServices: () => ({ chrome: mockChrome }),
}));

const pageTemplateProps = jest.fn();
const PageTemplate = ((props: { hideSolutionNav?: boolean; children?: React.ReactNode }) => {
  pageTemplateProps(props);
  return <>{props.children}</>;
}) as unknown as DigitalExperienceStartDeps['observabilityShared']['navigation']['PageTemplate'];

/** A page that takes the navigation's width, like a session with the sessions list beside it. */
function PageHidingTheNav() {
  useHideSideNav(true);
  return null;
}

const hideSolutionNav = () => pageTemplateProps.mock.calls.at(-1)?.[0].hideSolutionNav;

describe('AppPageTemplate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps the navigation while no page hides it', () => {
    render(
      <SideNavProvider>
        <AppPageTemplate PageTemplate={PageTemplate} />
      </SideNavProvider>
    );

    expect(hideSolutionNav()).toBe(false);
  });

  it('hides the navigation for a page that asked for its width', () => {
    render(
      <SideNavProvider>
        <AppPageTemplate PageTemplate={PageTemplate} />
        <PageHidingTheNav />
      </SideNavProvider>
    );

    expect(hideSolutionNav()).toBe(true);
  });
});
