/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useBulkAlertActionItems, type UseBulkAlertActionItemsArgs } from './use_alert_actions';
import { TableId } from '@kbn/securitysolution-data-table';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { FILTER_ACKNOWLEDGED, FILTER_OPEN } from '../../../../common/types';

jest.mock('../../../common/hooks/use_app_toasts');
jest.mock('../../containers/detection_engine/alerts/use_alerts_privileges', () => ({
  useAlertsPrivileges: jest.fn().mockReturnValue({ hasIndexWrite: true }),
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
});
