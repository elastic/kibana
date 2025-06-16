/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockStore } from '../../../../common/mock';
import { createFilterInDiscoverCellActionFactory } from './filter_in';
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

describe('createFilterInDiscoverCellActionFactory', () => {
  const createFilterInCellAction = createFilterInDiscoverCellActionFactory({
    store: mockStore,
    services,
  });
  const filterInAction = createFilterInCellAction({ id: 'testAction' });

  beforeEach(() => {
    currentAppIdSubject$.next(APP_UI_ID);
    jest.clearAllMocks();
  });

  const context = {
    data: [{ field: { name: 'user.name', type: 'string' }, value: 'the value' }],
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

    it('should return false if not in security', async () => {
      currentAppIdSubject$.next('not-security');
      expect(await filterInAction.isCompatible(context)).toEqual(false);
    });

    it('should return false if field not allowed', async () => {
      expect(
        await filterInAction.isCompatible({
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
      await filterInAction.execute(context);
      expect(mockGlobalFilterManager.addFilters).toHaveBeenCalled();
    });
  });
});
