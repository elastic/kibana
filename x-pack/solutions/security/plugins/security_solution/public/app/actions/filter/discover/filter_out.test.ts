/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockStore } from '../../../../common/mock';
import { createFilterOutDiscoverCellActionFactory } from './filter_out';
import type { SecurityCellActionExecutionContext } from '../../types';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import { BehaviorSubject } from 'rxjs';
import { APP_UI_ID } from '../../../../../common';

const services = createStartServicesMock();
const mockGlobalFilterManager = services.data.query.filterManager;

const currentAppIdSubject$ = new BehaviorSubject<string>(APP_UI_ID);
services.application.currentAppId$ = currentAppIdSubject$.asObservable();

jest.mock('@kbn/ui-actions-plugin/public', () => ({
  ...jest.requireActual('@kbn/ui-actions-plugin/public'),
  addFilterIn: () => {},
  addFilterOut: () => {},
}));

const mockStore = createMockStore();

describe('createFilterOutDiscoverCellActionFactory', () => {
  const createFilterOutCellAction = createFilterOutDiscoverCellActionFactory({
    store: mockStore,
    services,
  });
  const filterOutAction = createFilterOutCellAction({ id: 'testAction' });

  beforeEach(() => {
    currentAppIdSubject$.next(APP_UI_ID);
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
    expect(filterOutAction.getDisplayName(context)).toEqual('Filter out');
  });

  it('should return icon type', () => {
    expect(filterOutAction.getIconType(context)).toEqual('minusInCircle');
  });

  describe('isCompatible', () => {
    it('should return true if everything is okay', async () => {
      expect(await filterOutAction.isCompatible(context)).toEqual(true);
    });

    it('should return false if not in security', async () => {
      currentAppIdSubject$.next('not-security');
      expect(await filterOutAction.isCompatible(context)).toEqual(false);
    });

    it('should return false if field not allowed', async () => {
      expect(
        await filterOutAction.isCompatible({
          ...context,
          data: [
            { ...context.data[0], field: { ...context.data[0].field, name: 'signal.reason' } },
          ],
        })
      ).toEqual(false);
    });
  });

  describe('execution', () => {
    it('should execute using generic filterManager', async () => {
      await filterOutAction.execute(context);
      expect(mockGlobalFilterManager.addFilters).toHaveBeenCalled();
    });
  });
});
