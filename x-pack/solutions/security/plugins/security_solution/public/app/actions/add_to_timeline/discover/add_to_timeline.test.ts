/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityAppStore } from '../../../../common/store/types';
import { TimelineId } from '../../../../../common/types';
import { addProvider } from '../../../../timelines/store/actions';
import { createAddToTimelineDiscoverCellActionFactory } from './add_to_timeline';
import type { CellActionExecutionContext } from '@kbn/cell-actions';
import { GEO_FIELD_TYPE } from '../../../../timelines/components/timeline/body/renderers/constants';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import { APP_UI_ID } from '../../../../../common';
import { BehaviorSubject } from 'rxjs';

const services = createStartServicesMock();
const mockWarningToast = services.notifications.toasts.addWarning;

const currentAppIdSubject$ = new BehaviorSubject<string>(APP_UI_ID);
services.application.currentAppId$ = currentAppIdSubject$.asObservable();

const mockDispatch = jest.fn();
const store = {
  dispatch: mockDispatch,
} as unknown as SecurityAppStore;

const value = 'the-value';

const context = {
  data: [{ field: { name: 'user.name', type: 'string' }, value }],
} as CellActionExecutionContext;

const defaultDataProvider = {
  type: addProvider.type,
  payload: {
    id: TimelineId.active,
    providers: [
      {
        and: [],
        enabled: true,
        excluded: false,
        id: 'event-field-default-timeline-1-user_name-0-the-value',
        kqlQuery: '',
        name: 'user.name',
        queryMatch: {
          field: 'user.name',
          operator: ':',
          value: 'the-value',
        },
      },
    ],
  },
};

describe('createAddToTimelineDiscoverCellActionFactory', () => {
  const addToTimelineDiscoverCellActionFactory = createAddToTimelineDiscoverCellActionFactory({
    store,
    services,
  });
  const addToTimelineAction = addToTimelineDiscoverCellActionFactory({
    id: 'testAddToTimeline',
    order: 1,
  });

  beforeEach(() => {
    currentAppIdSubject$.next(APP_UI_ID);
    jest.clearAllMocks();
  });

  it('should return display name', () => {
    expect(addToTimelineAction.getDisplayName(context)).toEqual('Add to Timeline');
  });

  it('should return icon type', () => {
    expect(addToTimelineAction.getIconType(context)).toEqual('timeline');
  });

  describe('isCompatible', () => {
    it('should return true if everything is okay', async () => {
      expect(await addToTimelineAction.isCompatible(context)).toEqual(true);
    });

    it('should return false if not in security', async () => {
      currentAppIdSubject$.next('not-security');
      expect(await addToTimelineAction.isCompatible(context)).toEqual(false);
    });

    it('should return false if field not allowed', async () => {
      expect(
        await addToTimelineAction.isCompatible({
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

    it('should return true if the user has read access to timeline', async () => {
      const factory = createAddToTimelineDiscoverCellActionFactory({
        store,
        services: {
          ...services,
          application: {
            ...services.application,
            capabilities: {
              ...services.application.capabilities,
              securitySolutionTimeline: {
                read: true,
              },
            },
          },
        },
      });
      const addToTimelineActionIsCompatible = factory({
        id: 'testAddToTimeline',
        order: 1,
      });

      expect(await addToTimelineActionIsCompatible.isCompatible(context)).toEqual(true);
    });

    it('should return false if the user does not have access to timeline', async () => {
      const factory = createAddToTimelineDiscoverCellActionFactory({
        store,
        services: {
          ...services,
          application: {
            ...services.application,
            capabilities: {
              ...services.application.capabilities,
              securitySolutionTimeline: {
                read: false,
              },
            },
          },
        },
      });
      const addToTimelineActionIsCompatible = factory({
        id: 'testAddToTimeline',
        order: 1,
      });

      expect(await addToTimelineActionIsCompatible.isCompatible(context)).toEqual(false);
    });
  });

  describe('execute', () => {
    it('should execute normally', async () => {
      await addToTimelineAction.execute(context);
      expect(mockDispatch).toHaveBeenCalledWith(defaultDataProvider);
      expect(mockWarningToast).not.toHaveBeenCalled();
    });

    it('should show warning if no provider added', async () => {
      await addToTimelineAction.execute({
        ...context,
        data: [
          {
            ...context.data[0],
            field: {
              ...context.data[0].field,
              type: GEO_FIELD_TYPE,
            },
            value,
          },
        ],
      });
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockWarningToast).toHaveBeenCalled();
    });
  });
});
