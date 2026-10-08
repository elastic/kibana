/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';

import type { AddOrUpdateExceptionItemsFunc } from './use_close_alerts';
import { useCloseAlertsFromExceptions } from './use_close_alerts';
import { updateAlertStatus } from '../../../common/components/toolbar/bulk_actions/update_alerts';
import { getEsQueryFilter } from '../utils/get_es_query_filter';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../common/hooks/use_app_toasts.mock';

jest.mock('../../../common/components/toolbar/bulk_actions/update_alerts');
jest.mock('../utils/get_es_query_filter');
jest.mock('../../../common/hooks/use_app_toasts');

const updateAlertStatusMock = updateAlertStatus as jest.Mock;
const getEsQueryFilterMock = getEsQueryFilter as jest.Mock;

const exceptionItems = [getExceptionListItemSchemaMock()];
const ruleStaticIds = ['rule-static-id'];
const bulkCloseIndex = ['.alerts-security.alerts-default'];

/**
 * The hook assigns the close function to a ref inside an effect, so it is only
 * exposed on a subsequent render.
 */
const renderCloseAlerts = (): AddOrUpdateExceptionItemsFunc => {
  const { result, rerender } = renderHook(() => useCloseAlertsFromExceptions());
  rerender();

  const [, closeAlerts] = result.current;
  if (closeAlerts == null) {
    throw new Error('Expected useCloseAlertsFromExceptions to expose a close function');
  }

  return closeAlerts;
};

describe('useCloseAlertsFromExceptions', () => {
  beforeEach(() => {
    (useAppToasts as jest.Mock).mockReturnValue(useAppToastsMock.create());
    updateAlertStatusMock.mockResolvedValue({ updated: 1, version_conflicts: 0 });
    getEsQueryFilterMock.mockResolvedValue({ bool: {} });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('closing a single alert', () => {
    it('forwards the closing reason', async () => {
      const closeAlerts = renderCloseAlerts();

      await act(async () => {
        await closeAlerts({
          ruleStaticIds,
          exceptionItems,
          alertIdToClose: 'alert-id',
          reason: 'duplicate',
        });
      });

      expect(updateAlertStatusMock).toHaveBeenCalledWith(
        expect.objectContaining({
          signalIds: ['alert-id'],
          status: 'closed',
          reason: 'duplicate',
        })
      );
    });

    it('sends an undefined reason when none is selected', async () => {
      const closeAlerts = renderCloseAlerts();

      await act(async () => {
        await closeAlerts({ ruleStaticIds, exceptionItems, alertIdToClose: 'alert-id' });
      });

      expect(updateAlertStatusMock).toHaveBeenCalledWith(
        expect.objectContaining({ signalIds: ['alert-id'], status: 'closed', reason: undefined })
      );
    });
  });

  describe('bulk closing alerts', () => {
    it('forwards the closing reason', async () => {
      const closeAlerts = renderCloseAlerts();

      await act(async () => {
        await closeAlerts({
          ruleStaticIds,
          exceptionItems,
          bulkCloseIndex,
          reason: 'false_positive',
        });
      });

      expect(updateAlertStatusMock).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { bool: {} },
          status: 'closed',
          reason: 'false_positive',
        })
      );
    });

    it('sends an undefined reason when none is selected', async () => {
      const closeAlerts = renderCloseAlerts();

      await act(async () => {
        await closeAlerts({ ruleStaticIds, exceptionItems, bulkCloseIndex });
      });

      expect(updateAlertStatusMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'closed', reason: undefined })
      );
    });
  });

  it('forwards the closing reason to both requests when closing a single alert and bulk closing', async () => {
    const closeAlerts = renderCloseAlerts();

    await act(async () => {
      await closeAlerts({
        ruleStaticIds,
        exceptionItems,
        alertIdToClose: 'alert-id',
        bulkCloseIndex,
        reason: 'benign_positive',
      });
    });

    expect(updateAlertStatusMock).toHaveBeenCalledTimes(2);
    expect(updateAlertStatusMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ signalIds: ['alert-id'], reason: 'benign_positive' })
    );
    expect(updateAlertStatusMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ query: { bool: {} }, reason: 'benign_positive' })
    );
  });

  it('forwards the runtime fields alongside the reason when bulk closing', async () => {
    const closeAlerts = renderCloseAlerts();

    await act(async () => {
      await closeAlerts({
        ruleStaticIds,
        exceptionItems,
        bulkCloseIndex,
        runtimeFields: { 'host.name': 'keyword' },
        reason: 'other',
      });
    });

    expect(updateAlertStatusMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runtimeFields: { 'host.name': 'keyword' },
        reason: 'other',
      })
    );
  });
});
