/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import type { UseBulkAlertClosingReasonItemsProps } from './use_bulk_alert_closing_reason_items';
import {
  ALERT_CLOSING_REASON_PANEL_ID,
  useBulkAlertClosingReasonItems,
} from './use_bulk_alert_closing_reason_items';

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

function renderUseBulkAlertClosingReasonItems(
  props?: Partial<UseBulkAlertClosingReasonItemsProps>
) {
  return renderHook(() =>
    useBulkAlertClosingReasonItems({
      onSubmitCloseReason: jest.fn(),
      ...props,
    })
  );
}

describe('useBulkAlertClosingReasonItems', () => {
  const { result } = renderUseBulkAlertClosingReasonItems();

  it('should return one item to open the closing reason selection', () => {
    const item = result.current.item;
    expect(item?.panel).toBe(ALERT_CLOSING_REASON_PANEL_ID);
  });

  it('should return one panel', () => {
    const { panels } = result.current;
    expect(panels.length).toBe(1);
  });
});
