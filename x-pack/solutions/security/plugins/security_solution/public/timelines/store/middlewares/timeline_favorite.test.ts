/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

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

vi.mock('../actions', async () => {
  const actual = await vi.importActual('../actions');
  const endTLSaving = vi.fn((...args) => actual.endTimelineSaving(...args));
  (endTLSaving as unknown as { match: Function }).match = () => false;
  return {
    ...actual,
    showCallOutUnauthorizedMsg: vi
      .fn()
      .mockImplementation((...args) => actual.showCallOutUnauthorizedMsg(...args)),
    startTimelineSaving: vi
      .fn()
      .mockImplementation((...args) => actual.startTimelineSaving(...args)),
    endTimelineSaving: endTLSaving,
  };
});
vi.mock('../../containers/api');
vi.mock('./helpers', async () => {
  const actual = await vi.importActual('./helpers');

  return {
    ...actual,
    refreshTimelines: vi.fn(),
  };
});

const startTimelineSavingMock = startTimelineSaving as unknown as Mock;
const endTimelineSavingMock = endTimelineSaving as unknown as Mock;
const showCallOutUnauthorizedMsgMock = showCallOutUnauthorizedMsg as unknown as Mock;

describe('Timeline favorite middleware', () => {
  let store = createMockStore(undefined, undefined, kibanaMock);
  const newVersion = 'new_version';
  const newSavedObjectId = 'new_so_id';

  beforeEach(() => {
    store = createMockStore(undefined, undefined, kibanaMock);
    vi.clearAllMocks();
  });

  it('should persist a timeline favorite when a favorite action is dispatched', async () => {
    (persistFavorite as Mock).mockResolvedValue({
      favorite: [{}],
      savedObjectId: newSavedObjectId,
      version: newVersion,
    });
    expect(selectTimelineById(store.getState(), TimelineId.test).isFavorite).toEqual(false);
    await store.dispatch(updateIsFavorite({ id: TimelineId.test, isFavorite: true }));

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(refreshTimelines as unknown as Mock).toHaveBeenCalled();
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
    (persistFavorite as Mock).mockResolvedValue({
      favorite: [],
      savedObjectId: newSavedObjectId,
      version: newVersion,
    });
    expect(selectTimelineById(store.getState(), TimelineId.test).isFavorite).toEqual(true);
    await store.dispatch(updateIsFavorite({ id: TimelineId.test, isFavorite: false }));

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(refreshTimelines as unknown as Mock).toHaveBeenCalled();
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
    (persistFavorite as Mock).mockRejectedValue({
      body: { status_code: 403 },
    });

    await store.dispatch(updateIsFavorite({ id: TimelineId.test, isFavorite: true }));

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(showCallOutUnauthorizedMsgMock).toHaveBeenCalled();
  });

  it('should show a generic error when the persistence throws', async () => {
    const addDangerMock = vi.spyOn(kibanaMock.notifications.toasts, 'addDanger');
    (persistFavorite as Mock).mockImplementation(() => {
      throw new Error();
    });

    await store.dispatch(updateIsFavorite({ id: TimelineId.test, isFavorite: true }));

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(addDangerMock).toHaveBeenCalled();
  });
});
