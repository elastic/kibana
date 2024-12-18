/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { SecurityPageName } from '../../app/types';
import { useNavigateToAlertsPageWithFilters } from './use_navigate_to_alerts_page_with_filters';

const mockNavigateTo = jest.fn();
jest.mock('../lib/kibana', () => ({
  useNavigation: () => ({ navigateTo: mockNavigateTo }),
}));

describe('useNavigateToAlertsPageWithFilters', () => {
  it('navigates to alerts page with single filter', () => {
    const filter = {
      title: 'test filter',
      selectedOptions: ['test value'],
      fieldName: 'test field',
      exclude: false,
      existsSelected: false,
    };

    const {
      result: { current: navigateToAlertsPageWithFilters },
    } = renderHook(() => useNavigateToAlertsPageWithFilters());

    navigateToAlertsPageWithFilters(filter);

    expect(mockNavigateTo).toHaveBeenCalledWith({
      deepLinkId: SecurityPageName.alerts,
      path: "?pageFilters=!((exclude:!f,existsSelected:!f,fieldName:'test field',hideActionBar:!f,selectedOptions:!('test value'),title:'test filter'))",
      openInNewTab: false,
    });
  });

  it('navigates to alerts page with multiple filter', () => {
    const filters = [
      {
        title: 'test filter 1',
        selectedOptions: ['test value 1'],
        fieldName: 'test field 1',
        exclude: false,
        existsSelected: false,
      },
      {
        title: 'test filter 2',
        selectedOptions: ['test value 2'],
        fieldName: 'test field 2',
        exclude: true,
        existsSelected: true,
        hideActionBar: true,
      },
    ];

    const {
      result: { current: navigateToAlertsPageWithFilters },
    } = renderHook(() => useNavigateToAlertsPageWithFilters());

    navigateToAlertsPageWithFilters(filters);

    expect(mockNavigateTo).toHaveBeenCalledWith({
      deepLinkId: SecurityPageName.alerts,
      path: "?pageFilters=!((exclude:!f,existsSelected:!f,fieldName:'test field 1',hideActionBar:!f,selectedOptions:!('test value 1'),title:'test filter 1'),(exclude:!t,existsSelected:!t,fieldName:'test field 2',hideActionBar:!t,selectedOptions:!('test value 2'),title:'test filter 2'))",
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
});
