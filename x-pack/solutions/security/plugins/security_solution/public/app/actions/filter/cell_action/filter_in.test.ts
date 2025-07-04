/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { TableId } from '@kbn/securitysolution-data-table';

import { createMockStore, mockGlobalState } from '../../../../common/mock';
import { createFilterInCellActionFactory } from './filter_in';
import type { SecurityCellActionExecutionContext } from '../../types';
import { TimelineId } from '../../../../../common/types';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';

const services = createStartServicesMock();
const mockGlobalFilterManager = services.data.query.filterManager;
const mockWarningToast = services.notifications.toasts.addWarning;

const mockState = {
  ...mockGlobalState,
  timeline: {
    ...mockGlobalState.timeline,
    timelineById: {
      ...mockGlobalState.timeline.timelineById,
      [TimelineId.active]: {
        ...mockGlobalState.timeline.timelineById[TimelineId.active],
      },
    },
  },
};

jest.mock('@kbn/ui-actions-plugin/public', () => ({
  ...jest.requireActual('@kbn/ui-actions-plugin/public'),
  addFilterIn: () => {},
  addFilterOut: () => {},
}));

const mockStore = createMockStore(mockState);

describe('createFilterInCellActionFactory', () => {
  const createFilterInCellAction = createFilterInCellActionFactory({ store: mockStore, services });
  const filterInAction = createFilterInCellAction({ id: 'testAction' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const context = {
    data: [
      {
        field: { name: 'user.name', type: 'string' },
        value: 'the value',
      },
    ],
  } as SecurityCellActionExecutionContext;

  it('should return display name', () => {
    expect(filterInAction.getDisplayName(context)).toEqual('Filter for');
  });

  it('should return icon type', () => {
    expect(filterInAction.getIconType(context)).toEqual('plusInCircle');
  });

  describe('isCompatible', () => {
    it('should return true if everything is okay', async () => {
      expect(await filterInAction.isCompatible(context)).toEqual(true);
    });

    it('should return false if field not allowed', async () => {
      expect(
        await filterInAction.isCompatible({
          ...context,
          data: [
            {
              ...context.data[0],
              field: { ...context.data[0].field, name: 'signal.reason' },
            },
          ],
        })
      ).toEqual(false);
    });

    it('should return false if Kbn type is unsupported', async () => {
      expect(
        await filterInAction.isCompatible({
          ...context,
          data: [
            {
              ...context.data[0],
              field: { ...context.data[0].field, type: KBN_FIELD_TYPES.HISTOGRAM },
            },
          ],
        })
      ).toEqual(false);
    });
  });

  describe('execute', () => {
    describe('generic scope execution', () => {
      const dataTableContext = {
        ...context,
        metadata: { scopeId: TableId.alertsOnAlertsPage },
      } as SecurityCellActionExecutionContext;

      it('should execute using generic filterManager', async () => {
        await filterInAction.execute(dataTableContext);
        expect(mockGlobalFilterManager.addFilters).toHaveBeenCalled();
        expect(services.timelineDataService.query.filterManager.addFilters).not.toHaveBeenCalled();
      });

      it('should show warning if value type is unsupported', async () => {
        await filterInAction.execute({
          ...dataTableContext,
          data: [
            {
              ...context.data[0],
              value: { test: '123' },
            },
          ],
        });
        expect(mockGlobalFilterManager.addFilters).not.toHaveBeenCalled();
        expect(services.timelineDataService.query.filterManager.addFilters).not.toHaveBeenCalled();
        expect(mockWarningToast).toHaveBeenCalled();
      });
    });

    describe('timeline scope execution', () => {
      const timelineContext = {
        ...context,
        metadata: { scopeId: TimelineId.active },
      } as SecurityCellActionExecutionContext;

      it('should execute using timeline filterManager', async () => {
        await filterInAction.execute(timelineContext);
        expect(services.timelineDataService.query.filterManager.addFilters).toHaveBeenCalled();
        expect(mockGlobalFilterManager.addFilters).not.toHaveBeenCalled();
      });
    });

    describe('negateFilters', () => {
      it('if negateFilters is false, negate should be false (include)', async () => {
        await filterInAction.execute({
          ...context,
          metadata: {
            negateFilters: false,
          },
        });
        expect(mockGlobalFilterManager.addFilters).toHaveBeenCalledWith(
          expect.objectContaining({
            meta: expect.objectContaining({
              negate: false,
            }),
          })
        );
      });

      it('if negateFilters is true, negate should be true (do not include)', async () => {
        await filterInAction.execute({
          ...context,
          metadata: {
            negateFilters: true,
          },
        });
        expect(mockGlobalFilterManager.addFilters).toHaveBeenCalledWith(
          expect.objectContaining({
            meta: expect.objectContaining({
              negate: true,
            }),
          })
        );
      });
    });
  });
});
