/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import { type DataView } from '@kbn/data-plugin/common';
import { Direction } from '../../../../common/search_strategy';
import { TimelineId, TimelineTabs } from '../../../../common/types/timeline';
import { TimelineStatusEnum, TimelineTypeEnum } from '../../../../common/api/timeline';
import { convertTimelineAsInput } from './timeline_save';
import type { TimelineModel } from '../model';
import { createMockStore, kibanaMock } from '../../../common/mock';
import { selectTimelineById } from '../selectors';
import { copyTimeline, persistTimeline } from '../../containers/api';
import { refreshTimelines } from './helpers';
import * as i18n from '../../pages/translations';

import {
  endTimelineSaving,
  saveTimeline,
  setChanged,
  showCallOutUnauthorizedMsg,
  startTimelineSaving,
} from '../actions';
import { getMockDataViewWithMatchedIndices } from '../../../data_view_manager/mocks/mock_data_view';
import { mockDataViewManagerState } from '../../../data_view_manager/redux/mock';

jest.mock('../actions', () => {
  const actual = jest.requireActual('../actions');
  const endTLSaving = jest.fn((...args) => actual.endTimelineSaving(...args));
  (endTLSaving as unknown as { match: Function }).match = () => false;
  return {
    ...actual,
    showCallOutUnauthorizedMsg: jest
      .fn()
      .mockImplementation((...args) => actual.showCallOutUnauthorizedMsg(...args)),
    startTimelineSaving: jest
      .fn()
      .mockImplementation((...args) => actual.startTimelineSaving(...args)),
    endTimelineSaving: endTLSaving,
  };
});
jest.mock('../../containers/api');
jest.mock('./helpers', () => ({
  refreshTimelines: jest.fn(),
  extractTimelineIdsAndVersions: jest.requireActual('./helpers').extractTimelineIdsAndVersions,
}));

const startTimelineSavingMock = startTimelineSaving as unknown as jest.Mock;
const endTimelineSavingMock = endTimelineSaving as unknown as jest.Mock;
const showCallOutUnauthorizedMsgMock = showCallOutUnauthorizedMsg as unknown as jest.Mock;

describe('Timeline save middleware', () => {
  let store = createMockStore(undefined, undefined, kibanaMock);
  let dataView: DataView;

  beforeEach(() => {
    dataView = getMockDataViewWithMatchedIndices();
    dataView.version = 'is-persisted';

    (kibanaMock.plugins.onStart as jest.Mock).mockReturnValue({
      dataViews: {
        found: true,
        contract: { get: () => dataView },
      },
    });
    store = createMockStore(undefined, undefined, kibanaMock);
    jest.clearAllMocks();
  });

  it('should persist a timeline', async () => {
    (persistTimeline as jest.Mock).mockResolvedValue({
      savedObjectId: 'soid',
      version: 'newVersion',
    });
    await store.dispatch(setChanged({ id: TimelineId.test, changed: true }));
    expect(selectTimelineById(store.getState(), TimelineId.test)).toEqual(
      expect.objectContaining({
        version: null,
        changed: true,
      })
    );
    await store.dispatch(saveTimeline({ id: TimelineId.test, saveAsNew: false }));
    expect(mockDataViewManagerState).toBeDefined();
    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(persistTimeline as unknown as jest.Mock).toHaveBeenCalled();
    expect(persistTimeline as unknown as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        timeline: expect.objectContaining({
          dataViewId: mockDataViewManagerState.dataViewManager.timeline.dataViewId,
          indexNames: ['test'],
        }),
      })
    );
    expect(refreshTimelines as unknown as jest.Mock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(selectTimelineById(store.getState(), TimelineId.test)).toEqual(
      expect.objectContaining({
        version: 'newVersion',
        changed: false,
      })
    );
  });

  it('should copy a timeline', async () => {
    (copyTimeline as jest.Mock).mockResolvedValue({
      savedObjectId: 'soid',
      version: 'newVersion',
    });
    await store.dispatch(setChanged({ id: TimelineId.test, changed: true }));
    expect(selectTimelineById(store.getState(), TimelineId.test)).toEqual(
      expect.objectContaining({
        version: null,
        changed: true,
      })
    );
    await store.dispatch(saveTimeline({ id: TimelineId.test, saveAsNew: true }));

    expect(copyTimeline as unknown as jest.Mock).toHaveBeenCalled();
    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(refreshTimelines as unknown as jest.Mock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(selectTimelineById(store.getState(), TimelineId.test)).toEqual(
      expect.objectContaining({
        version: 'newVersion',
        changed: false,
      })
    );
  });

  it('should show an error message in case of a conflict', async () => {
    const addDangerMock = jest.spyOn(kibanaMock.notifications.toasts, 'addDanger');
    (copyTimeline as jest.Mock).mockResolvedValue({
      status_code: 409,
      message: 'test conflict',
    });
    await store.dispatch(saveTimeline({ id: TimelineId.test, saveAsNew: true }));

    expect(refreshTimelines as unknown as jest.Mock).not.toHaveBeenCalled();
    expect(addDangerMock).toHaveBeenCalledWith({
      title: i18n.TIMELINE_VERSION_CONFLICT_TITLE,
      text: i18n.TIMELINE_VERSION_CONFLICT_DESCRIPTION,
    });
  });

  it('should show the provided message in case of an error response', async () => {
    const addDangerMock = jest.spyOn(kibanaMock.notifications.toasts, 'addDanger');
    (persistTimeline as jest.Mock).mockResolvedValue({
      status_code: 404,
      message: 'test error message',
    });
    await store.dispatch(saveTimeline({ id: TimelineId.test, saveAsNew: false }));

    expect(refreshTimelines as unknown as jest.Mock).not.toHaveBeenCalled();
    expect(addDangerMock).toHaveBeenCalledWith({
      title: i18n.UPDATE_TIMELINE_ERROR_TITLE,
      text: 'test error message',
    });
  });

  it('should show a generic error in case of an empty response', async () => {
    const addDangerMock = jest.spyOn(kibanaMock.notifications.toasts, 'addDanger');
    (persistTimeline as jest.Mock).mockResolvedValue(null);
    await store.dispatch(saveTimeline({ id: TimelineId.test, saveAsNew: false }));

    expect(refreshTimelines as unknown as jest.Mock).not.toHaveBeenCalled();
    expect(addDangerMock).toHaveBeenCalledWith({
      title: i18n.UPDATE_TIMELINE_ERROR_TITLE,
      text: i18n.UPDATE_TIMELINE_ERROR_TEXT,
    });
  });

  it('should show an error message when the call is unauthorized', async () => {
    (persistTimeline as jest.Mock).mockResolvedValue({ status_code: 403 });
    await store.dispatch(saveTimeline({ id: TimelineId.test, saveAsNew: false }));

    expect(refreshTimelines as unknown as jest.Mock).not.toHaveBeenCalled();
    expect(showCallOutUnauthorizedMsgMock).toHaveBeenCalled();
  });

  describe('#convertTimelineAsInput ', () => {
    test('should return a SavedTimeline instead of TimelineModel ', () => {
      const columns: TimelineModel['columns'] = [
        {
          columnHeaderType: 'not-filtered',
          id: '@timestamp',
          initialWidth: 190,
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'message',
          initialWidth: 180,
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'event.category',
          initialWidth: 180,
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'event.action',
          initialWidth: 180,
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'host.name',
          initialWidth: 180,
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'source.ip',
          initialWidth: 180,
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'destination.ip',
          initialWidth: 180,
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'user.name',
          initialWidth: 180,
        },
      ];
      const timelineModel: TimelineModel = {
        activeTab: TimelineTabs.query,
        prevActiveTab: TimelineTabs.notes,
        columns,
        defaultColumns: columns,
        dataProviders: [
          {
            id: 'hosts-table-hostName-DESKTOP-QBBSCUT',
            name: 'DESKTOP-QBBSCUT',
            enabled: true,
            excluded: false,
            kqlQuery: '',
            queryMatch: {
              field: 'host.name',
              value: 'DESKTOP-QBBSCUT',
              operator: ':',
            },
            and: [
              {
                id: 'plain-column-renderer-data-provider-hosts-page-event_module-CQg7I24BHe9nqdOi_LYL-event_module-endgame',
                name: 'event.module: endgame',
                enabled: true,
                excluded: false,
                kqlQuery: '',
                queryMatch: {
                  field: 'event.module',
                  value: 'endgame',
                  operator: ':',
                },
              },
            ],
          },
        ],
        dataViewId: null,
        deletedEventIds: [],
        description: '',
        documentType: '',
        eqlOptions: {
          eventCategoryField: 'event.category',
          tiebreakerField: '',
          timestampField: '@timestamp',
        },
        eventIdToNoteIds: {},
        eventType: 'all',
        excludedRowRendererIds: [],
        highlightedDropAndProviderId: '',
        historyIds: [],
        filters: [
          {
            $state: { store: FilterStateStore.APP_STATE },
            meta: {
              alias: null,
              disabled: false,
              key: 'event.category',
              negate: false,
              params: { query: 'file' },
              type: 'phrase',
            },
            query: { match_phrase: { 'event.category': 'file' } },
          },
          {
            $state: { store: FilterStateStore.APP_STATE },
            meta: {
              alias: null,
              disabled: false,
              key: '@timestamp',
              negate: false,
              type: 'exists',
              value: 'exists',
            },
            query: { exists: { field: '@timestamp' } },
          } as Filter,
        ],
        indexNames: [],
        isFavorite: false,
        isLive: false,
        isSelectAllChecked: false,
        isSaving: false,
        itemsPerPage: 25,
        itemsPerPageOptions: [10, 25, 50, 100],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: {
            kuery: { kind: 'kuery', expression: 'endgame.user_name : "zeus" ' },
            serializedQuery:
              '{"bool":{"should":[{"match_phrase":{"endgame.user_name":"zeus"}}],"minimum_should_match":1}}',
          },
        },
        loadingEventIds: [],
        queryFields: [],
        title: 'saved',
        timelineType: TimelineTypeEnum.default,
        templateTimelineId: null,
        templateTimelineVersion: null,
        noteIds: [],
        pinnedEventIds: {},
        pinnedEventsSaveObject: {},
        dateRange: { start: '2019-10-30T21:06:27.644Z', end: '2019-10-31T21:06:27.644Z' },
        savedObjectId: '11169110-fc22-11e9-8ca9-072f15ce2685',
        selectAll: false,
        selectedEventIds: {},
        show: true,
        sort: [
          {
            columnId: '@timestamp',
            columnType: 'date',
            esTypes: ['date'],
            sortDirection: Direction.desc,
          },
        ],
        status: TimelineStatusEnum.active,
        version: 'WzM4LDFd',
        id: '11169110-fc22-11e9-8ca9-072f15ce2685',
        savedQueryId: 'my endgame timeline query',
        savedSearchId: null,
        savedSearch: null,
        isDataProviderVisible: true,
        sampleSize: 500,
      };

      expect(
        convertTimelineAsInput(timelineModel, {
          kind: 'absolute',
          from: '2019-10-30T21:06:27.644Z',
          fromStr: undefined,
          to: '2019-10-31T21:06:27.644Z',
          toStr: undefined,
        })
      ).toEqual({
        columns: [
          {
            columnHeaderType: 'not-filtered',
            id: '@timestamp',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'message',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.category',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.action',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'host.name',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'source.ip',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'destination.ip',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'user.name',
          },
        ],
        dataProviders: [
          {
            and: [
              {
                enabled: true,
                excluded: false,
                id: 'plain-column-renderer-data-provider-hosts-page-event_module-CQg7I24BHe9nqdOi_LYL-event_module-endgame',
                kqlQuery: '',
                name: 'event.module: endgame',
                queryMatch: {
                  field: 'event.module',
                  operator: ':',
                  value: 'endgame',
                },
              },
            ],
            enabled: true,
            excluded: false,
            id: 'hosts-table-hostName-DESKTOP-QBBSCUT',
            kqlQuery: '',
            name: 'DESKTOP-QBBSCUT',
            queryMatch: {
              field: 'host.name',
              operator: ':',
              value: 'DESKTOP-QBBSCUT',
            },
          },
        ],
        dataViewId: null,
        dateRange: {
          end: '2019-10-31T21:06:27.644Z',
          start: '2019-10-30T21:06:27.644Z',
        },
        description: '',
        eqlOptions: {
          eventCategoryField: 'event.category',
          tiebreakerField: '',
          timestampField: '@timestamp',
        },
        eventType: 'all',
        excludedRowRendererIds: [],
        filters: [
          {
            exists: null,
            match_all: null,
            meta: {
              alias: null,
              disabled: false,
              field: null,
              key: 'event.category',
              negate: false,
              params: '{"query":"file"}',
              type: 'phrase',
              value: null,
            },
            query: '{"match_phrase":{"event.category":"file"}}',
            range: null,
            script: null,
          },
          {
            query: '{"exists":{"field":"@timestamp"}}',
            match_all: null,
            meta: {
              alias: null,
              disabled: false,
              field: null,
              key: '@timestamp',
              negate: false,
              params: null,
              type: 'exists',
              value: 'exists',
            },
            range: null,
            script: null,
          },
        ],
        indexNames: [],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: {
            kuery: {
              expression: 'endgame.user_name : "zeus" ',
              kind: 'kuery',
            },
            serializedQuery:
              '{"bool":{"should":[{"match_phrase":{"endgame.user_name":"zeus"}}],"minimum_should_match":1}}',
          },
        },
        savedQueryId: 'my endgame timeline query',
        savedSearchId: null,
        sort: [
          {
            columnId: '@timestamp',
            columnType: 'date',
            esTypes: ['date'],
            sortDirection: 'desc',
          },
        ],
        templateTimelineId: null,
        templateTimelineVersion: null,
        timelineType: TimelineTypeEnum.default,
        title: 'saved',
        status: TimelineStatusEnum.active,
      });
    });
  });
});
