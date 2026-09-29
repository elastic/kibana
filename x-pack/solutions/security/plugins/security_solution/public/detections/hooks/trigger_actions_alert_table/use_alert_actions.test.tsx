/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { act, renderHook } from '@testing-library/react';
import { useBulkAlertActionItems, type UseBulkAlertActionItemsArgs } from './use_alert_actions';
import { TableId } from '@kbn/securitysolution-data-table';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { FILTER_ACKNOWLEDGED, FILTER_OPEN } from '../../../../common/types';
import { updateAlertStatus } from '../../../common/components/toolbar/bulk_actions/update_alerts';
import type { BulkActionsConfig } from '@kbn/response-ops-alerts-table/types';

vi.mock('../../../common/hooks/use_app_toasts');
vi.mock('../../containers/detection_engine/alerts/use_alerts_privileges', () => {
  const mocked = {
    useAlertsPrivileges: vi.fn().mockReturnValue({ hasAlertsUpdate: true }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../common/hooks/use_experimental_features', () => {
  const mocked = {
    useIsExperimentalFeatureEnabled: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../common/lib/apm/use_start_transaction', () => {
  const mocked = {
    useStartTransaction: vi.fn().mockReturnValue({ startTransaction: vi.fn() }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../use_alert_close_info_modal', () => {
  const mocked = {
    useAlertCloseInfoModal: vi
      .fn()
      .mockReturnValue({ promptAlertCloseConfirmation: vi.fn().mockResolvedValue(true) }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('@kbn/response-ops-detections-close-reason', () => {
  const mocked = {
    useBulkClosingReasonItems: vi
      .fn()
      .mockReturnValue({ item: { key: 'close-alert-with-reason', label: 'Close' }, panels: [] }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../common/components/toolbar/bulk_actions/update_alerts');
vi.mock('../../components/alerts_table/helpers', () => {
  const mocked = {
    buildTimeRangeFilter: vi.fn().mockReturnValue([]),
  };
  return { ...mocked, default: mocked };
});

(useAppToasts as Mock).mockReturnValue({
  addSuccess: vi.fn(),
  addError: vi.fn(),
});
(updateAlertStatus as Mock).mockResolvedValue({ updated: 1, version_conflicts: 0 });

function renderUseBulkAlertActionItems(props?: Partial<UseBulkAlertActionItemsArgs>) {
  return renderHook(() =>
    useBulkAlertActionItems({
      tableId: TableId.alertsOnAlertsPage,
      from: '2024-01-01T00:00:00.000Z',
      to: '2024-12-31T23:59:59.999Z',
      filters: [],
      ...props,
    })
  );
}

describe('useBulkAlertActionItems', () => {
  describe('items', () => {
    const { result } = renderUseBulkAlertActionItems();
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
    it('should add status group metadata and icons', () => {
      items.forEach((item) => {
        expect(item).toEqual(
          expect.objectContaining({
            groupId: 'status',
            icon: expect.anything(),
          })
        );
      });
    });
  });

  describe('onClick with isSelectAllChecked (query-based bulk close)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      (updateAlertStatus as Mock).mockResolvedValue({ updated: 1, version_conflicts: 0 });
    });

    const invokeOpenAction = async (props?: Partial<UseBulkAlertActionItemsArgs>) => {
      const { result } = renderUseBulkAlertActionItems(props);
      const openItem = result.current.items.find(
        (item) => item.key === `${FILTER_OPEN}-alert-status`
      ) as BulkActionsConfig;

      await act(async () => {
        await openItem.onClick!([], true, vi.fn(), vi.fn(), vi.fn());
      });
    };

    it('forwards runtimeMappings (with script preserved) when isSelectAllChecked', async () => {
      // This is the core regression test: prior code projected to [name, type] only,
      // discarding the Painless script. The fix sends the full mapping verbatim.
      const script = { source: "emit(doc['first'].value + ' ' + doc['last'].value)" };
      await invokeOpenAction({
        runtimeMappings: {
          display_name: { type: 'keyword', script },
          event_count: { type: 'long' },
        },
      });

      expect(updateAlertStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          runtimeMappings: {
            display_name: { type: 'keyword', script },
            event_count: { type: 'long' },
          },
        })
      );
    });

    it('passes runtimeMappings as undefined when runtimeMappings is not provided', async () => {
      await invokeOpenAction();

      expect(updateAlertStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          runtimeMappings: undefined,
        })
      );
    });

    it('drops composite and lookup types from runtimeMappings before forwarding', async () => {
      await invokeOpenAction({
        runtimeMappings: {
          valid: { type: 'keyword' },
          bad: { type: 'composite', fields: {} },
        },
      });

      expect(updateAlertStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          runtimeMappings: { valid: { type: 'keyword' } },
        })
      );
    });

    it('uses query (not signalIds) when isSelectAllChecked', async () => {
      await invokeOpenAction();

      expect(updateAlertStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.any(Object),
          signalIds: undefined,
        })
      );
    });
  });
});
