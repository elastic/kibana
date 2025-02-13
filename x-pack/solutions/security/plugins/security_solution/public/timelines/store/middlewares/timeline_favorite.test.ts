/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockStore, kibanaMock } from '../../../common/mock';
import { selectTimelineById } from '../selectors';
import { persistFavorite } from '../../containers/api';
import { TimelineId } from '../../../../common/types/timeline';
import { refreshTimelines } from './helpers';

import {
  startTimelineSaving,
  endTimelineSaving,
  updateIsFavorite,
  showCallOutUnauthorizedMsg,
  updateTimeline,
} from '../actions';

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
jest.mock('./helpers', () => {
  const actual = jest.requireActual('./helpers');

  return {
    ...actual,
    refreshTimelines: jest.fn(),
  };
});

const startTimelineSavingMock = startTimelineSaving as unknown as jest.Mock;
const endTimelineSavingMock = endTimelineSaving as unknown as jest.Mock;
const showCallOutUnauthorizedMsgMock = showCallOutUnauthorizedMsg as unknown as jest.Mock;

describe('Timeline favorite middleware', () => {
  let store = createMockStore(undefined, undefined, kibanaMock);
  const newVersion = 'new_version';
  const newSavedObjectId = 'new_so_id';

  beforeEach(() => {
    store = createMockStore(undefined, undefined, kibanaMock);
    jest.clearAllMocks();
  });

  it('should persist a timeline favorite when a favorite action is dispatched', async () => {
    (persistFavorite as jest.Mock).mockResolvedValue({
      favorite: [{}],
      savedObjectId: newSavedObjectId,
      version: newVersion,
    });
    expect(selectTimelineById(store.getState(), TimelineId.test).isFavorite).toEqual(false);
    await store.dispatch(updateIsFavorite({ id: TimelineId.test, isFavorite: true }));

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(refreshTimelines as unknown as jest.Mock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(selectTimelineById(store.getState(), TimelineId.test)).toEqual(
      expect.objectContaining({
        isFavorite: true,
        savedObjectId: newSavedObjectId,
        version: newVersion,
      })
    );
  });

  it('should persist a timeline un-favorite when a favorite action is dispatched for a favorited timeline', async () => {
    store.dispatch(
      updateTimeline({
        id: TimelineId.test,
        timeline: {
          ...selectTimelineById(store.getState(), TimelineId.test),
          isFavorite: true,
        },
      })
    );
    (persistFavorite as jest.Mock).mockResolvedValue({
      favorite: [],
      savedObjectId: newSavedObjectId,
      version: newVersion,
    });
    expect(selectTimelineById(store.getState(), TimelineId.test).isFavorite).toEqual(true);
    await store.dispatch(updateIsFavorite({ id: TimelineId.test, isFavorite: false }));

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(refreshTimelines as unknown as jest.Mock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(selectTimelineById(store.getState(), TimelineId.test)).toEqual(
      expect.objectContaining({
        isFavorite: false,
        savedObjectId: newSavedObjectId,
        version: newVersion,
      })
    );
  });

  it('should show an error message when the call is unauthorized', async () => {
    (persistFavorite as jest.Mock).mockRejectedValue({
      body: { status_code: 403 },
    });

    await store.dispatch(updateIsFavorite({ id: TimelineId.test, isFavorite: true }));

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(showCallOutUnauthorizedMsgMock).toHaveBeenCalled();
  });

  it('should show a generic error when the persistence throws', async () => {
    const addDangerMock = jest.spyOn(kibanaMock.notifications.toasts, 'addDanger');
    (persistFavorite as jest.Mock).mockImplementation(() => {
      throw new Error();
    });

    await store.dispatch(updateIsFavorite({ id: TimelineId.test, isFavorite: true }));

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(addDangerMock).toHaveBeenCalled();
  });
});
