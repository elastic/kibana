/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useBulkAlertActionItems, type UseBulkAlertActionItemsArgs } from './use_alert_actions';
import { TableId } from '@kbn/securitysolution-data-table';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { FILTER_ACKNOWLEDGED, FILTER_CLOSED, FILTER_OPEN } from '../../../../common/types';

jest.mock('../../../common/hooks/use_app_toasts');
jest.mock('../../containers/detection_engine/alerts/use_alerts_privileges', () => ({
  useAlertsPrivileges: jest.fn().mockReturnValue({ hasAlertsUpdate: true }),
}));
jest.mock('../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));
(useAppToasts as jest.Mock).mockReturnValue({
  addSuccess: jest.fn(),
  addError: jest.fn(),
});

function renderUseBulkAlertActionItems(props?: Partial<UseBulkAlertActionItemsArgs>) {
  return renderHook(() =>
    useBulkAlertActionItems({
      tableId: TableId.alertsOnAlertsPage,
      from: '',
      to: '',
      filters: [],
      ...props,
    })
  );
}

const getSelectedAlert = (status: string) => ({
  _id: `alert-${status}`,
  _index: 'alerts-index',
  data: [{ field: ALERT_WORKFLOW_STATUS, value: [status] }],
  ecs: { _id: `alert-${status}`, _index: 'alerts-index' },
});

describe('useBulkAlertActionItems', () => {
  const { result } = renderUseBulkAlertActionItems();

  describe('items', () => {
    const items = result.current.items;

    it('should include "Mark as open"', () => {
      expect(items.find((item) => item.key === `${FILTER_OPEN}-alert-status`)).not.toBeUndefined();
    });
    it('should include "Mark as aknowledged"', () => {
      expect(
        items.find((item) => item.key === `${FILTER_ACKNOWLEDGED}-alert-status`)
      ).not.toBeUndefined();
    });
    it('should include "Mark as closed"', () => {
      expect(items.find((item) => item.key === 'close-alert-with-reason')).not.toBeUndefined();
    });
  });

  describe('item visibility', () => {
    it.each([
      { status: FILTER_OPEN, key: `${FILTER_OPEN}-alert-status` },
      { status: FILTER_ACKNOWLEDGED, key: `${FILTER_ACKNOWLEDGED}-alert-status` },
      { status: FILTER_CLOSED, key: 'close-alert-with-reason' },
    ])('hides "$status" when all selected alerts already have that status', ({ status, key }) => {
      const { result: hookResult } = renderUseBulkAlertActionItems();
      const item = hookResult.current.items.find((action) => action.key === key);

      expect(item?.isVisible?.([getSelectedAlert(status)], false)).toBe(false);
    });

    it('keeps status actions visible for mixed selected alert statuses', () => {
      const { result: hookResult } = renderUseBulkAlertActionItems();
      const openItem = hookResult.current.items.find(
        (item) => item.key === `${FILTER_OPEN}-alert-status`
      );

      expect(
        openItem?.isVisible?.(
          [getSelectedAlert(FILTER_OPEN), getSelectedAlert(FILTER_CLOSED)],
          false
        )
      ).toBe(true);
    });

    it('keeps status actions visible when all alerts are selected by query', () => {
      const { result: hookResult } = renderUseBulkAlertActionItems();
      const openItem = hookResult.current.items.find(
        (item) => item.key === `${FILTER_OPEN}-alert-status`
      );

      expect(openItem?.isVisible?.([getSelectedAlert(FILTER_OPEN)], true)).toBe(true);
    });
  });
});
