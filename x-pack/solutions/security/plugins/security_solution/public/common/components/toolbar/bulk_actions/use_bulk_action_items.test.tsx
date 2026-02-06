/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { BulkActionsProps } from './use_bulk_action_items';
import { useBulkActionItems } from './use_bulk_action_items';
import { useAppToasts } from '../../../hooks/use_app_toasts';

jest.mock('../../../hooks/use_app_toasts');
jest.mock('../../../lib/kibana');
jest.mock(
  '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges',
  () => ({
    useAlertsPrivileges: jest.fn().mockReturnValue({ hasIndexWrite: true }),
  })
);
jest.mock('../../../hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));
(useAppToasts as jest.Mock).mockReturnValue({
  addSuccess: jest.fn(),
  addError: jest.fn(),
});

function renderUseBulkActionItems(props?: Partial<BulkActionsProps>) {
  return renderHook(() =>
    useBulkActionItems({
      eventIds: ['mockEventId'],
      setEventsDeleted: jest.fn(),
      setEventsLoading: jest.fn(),
      ...props,
    })
  );
}

describe('useBulkActionItems', () => {
  it('should return "mark as open" option by default', () => {
    const { result } = renderUseBulkActionItems();
    expect(
      result.current.items.find((item) => item['data-test-subj'] === 'open-alert-status')
    ).not.toBeUndefined();
  });
  it('should return "mark as acknowledged" option by default', () => {
    const { result } = renderUseBulkActionItems();
    expect(
      result.current.items.find((item) => item['data-test-subj'] === 'acknowledged-alert-status')
    ).not.toBeUndefined();
  });
  it('should return "mark as closed" option by default', () => {
    const { result } = renderUseBulkActionItems();
    expect(
      result.current.items.find(
        (item) => item['data-test-subj'] === 'alert-close-context-menu-item'
      )
    ).not.toBeUndefined();
  });
});
