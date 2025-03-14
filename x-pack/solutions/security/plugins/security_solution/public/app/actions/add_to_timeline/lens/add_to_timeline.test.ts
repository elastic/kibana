/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BehaviorSubject, Subject } from 'rxjs';
import type { CellValueContext } from '@kbn/embeddable-plugin/public';
import type { SecurityAppStore } from '../../../../common/store/types';
import { createAddToTimelineLensAction, getInvestigatedValue } from './add_to_timeline';
import { KibanaServices } from '../../../../common/lib/kibana';
import { APP_UI_ID } from '../../../../../common/constants';
import type { DataProvider } from '../../../../../common/types';
import { TimelineId, EXISTS_OPERATOR } from '../../../../../common/types';
import { addProvider } from '../../../../timelines/store/actions';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { LensApi } from '@kbn/lens-plugin/public';
import { getLensApiMock } from '@kbn/lens-plugin/public/react_embeddable/mocks';

jest.mock('../../../../common/lib/kibana');
const currentAppId$ = new Subject<string | undefined>();
KibanaServices.get().application.currentAppId$ = currentAppId$.asObservable();
const mockWarningToast = jest.fn();
const mockSuccessToast = jest.fn();
KibanaServices.get().notifications.toasts.addWarning = mockWarningToast;
KibanaServices.get().notifications.toasts.addSuccess = mockSuccessToast;
const mockDispatch = jest.fn();
const store = {
  dispatch: mockDispatch,
} as unknown as SecurityAppStore;

const getMockLensApi = (
  { from, to = 'now' }: { from: string; to: string } = { from: 'now-24h', to: 'now' }
): LensApi =>
  getLensApiMock({
    timeRange$: new BehaviorSubject<TimeRange | undefined>({ from, to }),
    getViewUnderlyingDataArgs: jest.fn(() => ({
      dataViewSpec: { id: 'index-pattern-id' },
      timeRange: { from: 'now-7d', to: 'now' },
      filters: [],
      query: undefined,
      columns: [],
    })),
    saveToLibrary: jest.fn(async () => 'saved-id'),
  });

const lensEmbeddable = getMockLensApi();

const columnMeta = {
  field: 'user.name',
  type: 'string' as const,
  source: 'esaggs',
  sourceParams: { indexPatternId: 'some-pattern-id' },
};
const value = 'the value';
const eventId = 'event_1';
const data: CellValueContext['data'] = [{ columnMeta, value, eventId }];

const context = {
  data,
  embeddable: lensEmbeddable,
} as unknown as ActionExecutionContext<CellValueContext>;

describe('createAddToTimelineLensAction', () => {
  const addToTimelineAction = createAddToTimelineLensAction({ store, order: 1 });

  beforeEach(() => {
    currentAppId$.next(APP_UI_ID);
    jest.clearAllMocks();
  });

  it('should return display name', () => {
    expect(addToTimelineAction.getDisplayName(context)).toEqual('Add to Timeline');
  });

  it('should return icon type', () => {
    expect(addToTimelineAction.getIconType(context)).toEqual('timeline');
  });

  describe('isCompatible', () => {
    it('should return false if lens embeddable has blocking error', async () => {
      expect(
        await addToTimelineAction.isCompatible({
          ...context,
          embeddable: {
            ...getMockLensApi(),
            blockingError$: new BehaviorSubject(new Error('some error')),
          },
        })
      ).toEqual(false);
    });

    it('should return false if not lens embeddable', async () => {
      expect(
        await addToTimelineAction.isCompatible({
          ...context,
          embeddable: {
            type: 'not_lens',
          },
        })
      ).toEqual(false);
    });

    it('should return false if data is empty', async () => {
      expect(
        await addToTimelineAction.isCompatible({
          ...context,
          data: [],
        })
      ).toEqual(false);
    });

    it('should return false if data do not have column meta', async () => {
      expect(
        await addToTimelineAction.isCompatible({
          ...context,
          data: [{}],
        })
      ).toEqual(false);
    });

    it('should return false if data column meta do not have field', async () => {
      const { field, ...testColumnMeta } = columnMeta;
      expect(
        await addToTimelineAction.isCompatible({
          ...context,
          data: [{ columnMeta: testColumnMeta }],
        })
      ).toEqual(false);
    });

    it('should return false if data column meta field is blacklisted', async () => {
      const testColumnMeta = { ...columnMeta, field: 'signal.reason' };
      expect(
        await addToTimelineAction.isCompatible({
          ...context,
          data: [{ columnMeta: testColumnMeta }],
        })
      ).toEqual(false);
    });

    it('should return false if data column meta field not filterable', async () => {
      let testColumnMeta = { ...columnMeta, source: '' };
      expect(
        await addToTimelineAction.isCompatible({
          ...context,
          data: [{ columnMeta: testColumnMeta }],
        })
      ).toEqual(false);

      testColumnMeta = { ...columnMeta, sourceParams: { indexPatternId: '' } };
      expect(
        await addToTimelineAction.isCompatible({
          ...context,
          data: [{ columnMeta: testColumnMeta }],
        })
      ).toEqual(false);
    });

    it('should return false if not in Security', async () => {
      currentAppId$.next('not security');
      expect(await addToTimelineAction.isCompatible(context)).toEqual(false);
    });

    it('should return false when the user does not have access to timeline', async () => {
      (
        KibanaServices.get().application.capabilities.securitySolutionTimeline as {
          crud: boolean;
          read: boolean;
        }
      ).read = false;
      const _action = createAddToTimelineLensAction({ store, order: 1 });
      expect(await _action.isCompatible(context)).toEqual(false);
    });

    it('should return true when the user has read access to timeline', async () => {
      (
        KibanaServices.get().application.capabilities.securitySolutionTimeline as {
          crud: boolean;
          read: boolean;
        }
      ).read = true;
      const _action = createAddToTimelineLensAction({ store, order: 1 });
      expect(await _action.isCompatible(context)).toEqual(false);
    });
  });

  describe('execute', () => {
    it('should execute normally', async () => {
      await addToTimelineAction.execute(context);
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: addProvider.type,
        payload: {
          id: TimelineId.active,
          providers: [
            {
              and: [],
              enabled: true,
              excluded: false,
              id: 'event-field-default-timeline-1-event_1-user_name-0-the value',
              kqlQuery: '',
              name: 'user.name',
              queryMatch: {
                field: 'user.name',
                operator: ':',
                value: 'the value',
              },
            },
          ],
        },
      });

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockWarningToast).not.toHaveBeenCalled();
    });

    it('should add exclusive provider for empty values', async () => {
      await addToTimelineAction.execute({
        ...context,
        data: [{ columnMeta }],
      });
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: addProvider.type,
        payload: {
          id: TimelineId.active,
          providers: [
            {
              and: [],
              enabled: true,
              excluded: true,
              id: 'empty-value-timeline-1-user_name-0',
              kqlQuery: '',
              name: 'user.name',
              queryMatch: {
                field: 'user.name',
                operator: ':*',
                value: '',
              },
            },
          ],
        },
      });
      expect(mockSuccessToast).toHaveBeenCalledTimes(1);
      expect(mockWarningToast).not.toHaveBeenCalled();
    });

    it('should add exclusive provider for count', async () => {
      await addToTimelineAction.execute({
        ...context,
        data: [
          {
            columnMeta: {
              ...columnMeta,
              type: 'number',
              sourceParams: {
                type: 'value_count',
              },
            },
          },
        ],
      });
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: addProvider.type,
        payload: {
          id: TimelineId.active,
          providers: [
            {
              and: [],
              enabled: true,
              excluded: false,
              id: 'value-count-data-provider-timeline-1-user_name',
              kqlQuery: '',
              name: 'user.name',
              queryMatch: {
                field: 'user.name',
                operator: ':*',
                value: '',
              },
            },
          ],
        },
      });

      expect(mockSuccessToast).toHaveBeenCalledTimes(1);
      expect(mockWarningToast).not.toHaveBeenCalled();
    });

    it('should show warning if no provider added', async () => {
      await addToTimelineAction.execute({
        ...context,
        data: [],
      });
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockWarningToast).toHaveBeenCalled();
    });

    it('should show warning if no field in the data column meta', async () => {
      await addToTimelineAction.execute({
        ...context,
        data: [{ columnMeta: { ...columnMeta, field: undefined }, value }],
      });
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockWarningToast).toHaveBeenCalled();
    });
  });
});

describe('getInvestigatedValue', () => {
  it('handles empty input', () => {
    const result = getInvestigatedValue([
      { queryMatch: { value: null } },
    ] as unknown as DataProvider[]);
    expect(result).toEqual('');
  });
  it('handles array input', () => {
    const result = getInvestigatedValue([
      {
        queryMatch: { value: ['hello', 'world'] },
      },
    ] as unknown as DataProvider[]);
    expect(result).toEqual('hello, world');
  });
  it('handles number value', () => {
    const result = getInvestigatedValue([
      {
        queryMatch: { value: '', operator: EXISTS_OPERATOR, field: 'host.name' },
      },
    ] as unknown as DataProvider[]);
    expect(result).toEqual('host.name');
  });
});
