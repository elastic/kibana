/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FrameworkRequest } from '../../../../framework';
import type { TimelineResponse } from '../../../../../../common/api/timeline';
import { getExportTimelineByObjectIds } from './helpers';
import { getSelectedTimelines } from '../../../saved_object/timelines';
import * as noteLib from '../../../saved_object/notes';
import * as pinnedEventLib from '../../../saved_object/pinned_events';

jest.mock('../../../saved_object/timelines', () => ({
  getSelectedTimelines: jest.fn(),
}));

jest.mock('../../../saved_object/notes', () => ({
  getNotesByTimelineId: jest.fn(),
}));

jest.mock('../../../saved_object/pinned_events', () => ({
  getAllPinnedEventsByTimelineId: jest.fn(),
}));

describe('export timelines helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enriches notes and pinned events in bounded batches', async () => {
    const timelines = Array.from({ length: 11 }, (_, index) => ({
      savedObjectId: `timeline-${index}`,
      status: 'active',
    })) as unknown as TimelineResponse[];

    (getSelectedTimelines as jest.Mock).mockResolvedValue({
      timelines,
      errors: [],
    });

    const pendingNotes: Array<() => void> = [];
    const pendingPinnedEvents: Array<() => void> = [];
    (noteLib.getNotesByTimelineId as jest.Mock).mockImplementation((_, timelineId: string) => {
      return new Promise((resolve) => {
        pendingNotes.push(() => resolve([{ timelineId }]));
      });
    });
    (pinnedEventLib.getAllPinnedEventsByTimelineId as jest.Mock).mockImplementation(
      (_, timelineId: string) => {
        return new Promise((resolve) => {
          pendingPinnedEvents.push(() => resolve([{ timelineId, eventId: `event-${timelineId}` }]));
        });
      }
    );

    const exportPromise = getExportTimelineByObjectIds({
      frameworkRequest: {} as FrameworkRequest,
      ids: timelines.map((timeline) => timeline.savedObjectId),
    });

    await Promise.resolve();

    expect(noteLib.getNotesByTimelineId).toHaveBeenCalledTimes(10);
    expect(pinnedEventLib.getAllPinnedEventsByTimelineId).toHaveBeenCalledTimes(10);

    pendingNotes.splice(0, 10).forEach((resolveNote) => resolveNote());
    pendingPinnedEvents.splice(0, 10).forEach((resolvePinnedEvent) => resolvePinnedEvent());
    await new Promise(process.nextTick);

    expect(noteLib.getNotesByTimelineId).toHaveBeenCalledTimes(11);
    expect(pinnedEventLib.getAllPinnedEventsByTimelineId).toHaveBeenCalledTimes(11);

    pendingNotes.forEach((resolveNote) => resolveNote());
    pendingPinnedEvents.forEach((resolvePinnedEvent) => resolvePinnedEvent());

    await expect(exportPromise).resolves.toContain('timeline-0');
  });
});
