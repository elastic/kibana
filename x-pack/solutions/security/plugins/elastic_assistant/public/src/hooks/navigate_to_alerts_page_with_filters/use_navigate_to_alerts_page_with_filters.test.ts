/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { useNavigateToAlertsPageWithFilters } from './use_navigate_to_alerts_page_with_filters';

const mockNavigateTo = jest.fn();
jest.mock('@kbn/security-solution-navigation', () => ({
  ...jest.requireActual('@kbn/security-solution-navigation'),
  useNavigation: () => ({ navigateTo: mockNavigateTo }),
}));

describe('useNavigateToAlertsPageWithFilters', () => {
  it('navigates to alerts page with single filter', () => {
    const filter = {
      title: 'test filter',
      selected_options: ['test value'],
      field_name: 'test field',
      exclude: false,
      exists_selected: false,
    };

    const {
      result: { current: navigateToAlertsPageWithFilters },
    } = renderHook(() => useNavigateToAlertsPageWithFilters());

    navigateToAlertsPageWithFilters(filter);

    expect(mockNavigateTo).toHaveBeenCalledWith({
      deepLinkId: SecurityPageName.alerts,
      path: "?pageFilters=!((display_settings:(hide_action_bar:!f),exclude:!f,exists_selected:!f,field_name:'test field',selected_options:!('test value'),title:'test filter'))",
      openInNewTab: false,
    });
  });

  it('navigates to alerts page with multiple filter', () => {
    const filters = [
      {
        title: 'test filter 1',
        selected_options: ['test value 1'],
        field_name: 'test field 1',
        exclude: false,
        exists_selected: false,
      },
      {
        title: 'test filter 2',
        selected_options: ['test value 2'],
        field_name: 'test field 2',
        exclude: true,
        exists_selected: true,
        display_settings: { hide_action_bar: true },
      },
    ];

    const {
      result: { current: navigateToAlertsPageWithFilters },
    } = renderHook(() => useNavigateToAlertsPageWithFilters());

    navigateToAlertsPageWithFilters(filters);

    expect(mockNavigateTo).toHaveBeenCalledWith({
      deepLinkId: SecurityPageName.alerts,
      path: "?pageFilters=!((display_settings:(hide_action_bar:!f),exclude:!f,exists_selected:!f,field_name:'test field 1',selected_options:!('test value 1'),title:'test filter 1'),(display_settings:(hide_action_bar:!t),exclude:!t,exists_selected:!t,field_name:'test field 2',selected_options:!('test value 2'),title:'test filter 2'))",
      openInNewTab: false,
    });
  });

  it('navigates to alerts page when no filter is provided', () => {
    const {
      result: { current: navigateToAlertsPageWithFilters },
    } = renderHook(() => useNavigateToAlertsPageWithFilters());

    navigateToAlertsPageWithFilters([]);

    expect(mockNavigateTo).toHaveBeenCalledWith(
      expect.objectContaining({ deepLinkId: SecurityPageName.alerts })
    );
  });

  it('navigates to alerts page in new tab', () => {
    const filter = {
      title: 'test filter',
      selected_options: ['test value'],
      field_name: 'test field',
      exclude: false,
      exists_selected: false,
    };
    const openInNewTab = true;

    const {
      result: { current: navigateToAlertsPageWithFilters },
    } = renderHook(() => useNavigateToAlertsPageWithFilters());

    navigateToAlertsPageWithFilters(filter, openInNewTab);

    expect(mockNavigateTo).toHaveBeenCalledWith({
      deepLinkId: SecurityPageName.alerts,
      path: "?pageFilters=!((display_settings:(hide_action_bar:!f),exclude:!f,exists_selected:!f,field_name:'test field',selected_options:!('test value'),title:'test filter'))",
      openInNewTab: true,
    });
  });

  it('navigates to alerts page with timerange', () => {
    const filter = {
      title: 'test filter',
      selected_options: ['test value'],
      field_name: 'test field',
      exclude: false,
      exists_selected: false,
    };

    const timerange =
      '(global:(timerange:(from:"2024-12-12T17:03:23.481Z",kind:absolute,to:"2025-01-04T07:59:59.999Z")))';

    const openInNewTab = true;

    const {
      result: { current: navigateToAlertsPageWithFilters },
    } = renderHook(() => useNavigateToAlertsPageWithFilters());

    navigateToAlertsPageWithFilters(filter, openInNewTab, timerange);

    expect(mockNavigateTo).toHaveBeenCalledWith({
      deepLinkId: SecurityPageName.alerts,
      path: `?pageFilters=!((display_settings:(hide_action_bar:!f),exclude:!f,exists_selected:!f,field_name:'test field',selected_options:!('test value'),title:'test filter'))&timerange=(global:(timerange:(from:"2024-12-12T17:03:23.481Z",kind:absolute,to:"2025-01-04T07:59:59.999Z")))`,
      openInNewTab: true,
    });
  });
});
