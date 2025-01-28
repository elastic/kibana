/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { usePanelSideNavItems } from './use_panel_side_nav_items';
import { SecurityPageName } from '@kbn/security-solution-navigation';

jest.mock('@kbn/security-solution-navigation/src/navigation');

const mockUseLocation = jest.fn(() => ({ pathname: '/' }));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => mockUseLocation(),
}));

describe('usePanelSideNavItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty items', async () => {
    const { result } = renderHook(usePanelSideNavItems, { initialProps: [] });
    const items = result.current;
    expect(items).toEqual([]);
  });

  it('should return main items', async () => {
    const { result } = renderHook(usePanelSideNavItems, {
      initialProps: [
        { id: SecurityPageName.alerts, title: 'Alerts' },
        { id: SecurityPageName.case, title: 'Cases' },
      ],
    });

    const items = result.current;
    expect(items).toEqual([
      {
        id: SecurityPageName.alerts,
        label: 'Alerts',
        position: 'top',
        onClick: expect.any(Function),
      },
      {
        id: SecurityPageName.case,
        label: 'Cases',
        position: 'top',
        onClick: expect.any(Function),
      },
    ]);
  });

  it('should return secondary items', async () => {
    const { result } = renderHook(usePanelSideNavItems, {
      initialProps: [
        {
          id: SecurityPageName.dashboards,
          title: 'Dashboards',
          links: [{ id: SecurityPageName.detectionAndResponse, title: 'Detection & Response' }],
        },
      ],
    });

    const items = result.current;
    expect(items).toEqual([
      {
        id: SecurityPageName.dashboards,
        label: 'Dashboards',
        position: 'top',
        onClick: expect.any(Function),
        items: [
          {
            id: SecurityPageName.detectionAndResponse,
            label: 'Detection & Response',
            onClick: expect.any(Function),
          },
        ],
      },
    ]);
  });

  it('should return get started link', async () => {
    const { result } = renderHook(usePanelSideNavItems, {
      initialProps: [
        {
          id: SecurityPageName.landing,
          title: 'Get Started',
          sideNavIcon: 'launch',
          isFooterLink: true,
        },
      ],
    });

    const items = result.current;

    expect(items).toEqual([
      {
        id: SecurityPageName.landing,
        label: 'Get Started',
        position: 'bottom',
        onClick: expect.any(Function),
        iconType: 'launch',
      },
    ]);
  });
});
