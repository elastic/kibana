/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import { transformDataToNdjson } from '@kbn/securitysolution-utils';

import type {
  ExportedNotes,
  ExportTimelineNotFoundError,
  Note,
  PinnedEvent,
  TimelineResponse,
} from '../../../../../../common/api/timeline';

import type { FrameworkRequest } from '../../../../framework';
import * as noteLib from '../../../saved_object/notes';
import * as pinnedEventLib from '../../../saved_object/pinned_events';

import { getSelectedTimelines } from '../../../saved_object/timelines';

const EXPORT_TIMELINE_ENRICHMENT_BATCH_SIZE = 10;

const getGlobalEventNotesByTimelineId = (currentNotes: Note[]): ExportedNotes => {
  const initialNotes: ExportedNotes = {
    eventNotes: [],
    globalNotes: [],
  };

  return currentNotes.reduce((acc, note) => {
    if (note.eventId == null) {
      acc.globalNotes.push(note);
    } else {
      acc.eventNotes.push(note);
    }
    return acc;
  }, initialNotes);
};

const getPinnedEventsIdsByTimelineId = (currentPinnedEvents: PinnedEvent[]): string[] => {
  return currentPinnedEvents.map((event) => event.eventId) ?? [];
};

const getTimelineNotesAndPinnedEvents = async (
  request: FrameworkRequest,
  exportedIds: string[]
): Promise<{ notes: Note[]; pinnedEvents: PinnedEvent[] }> => {
  const notes: Note[] = [];
  const pinnedEvents: PinnedEvent[] = [];

  for (let index = 0; index < exportedIds.length; index += EXPORT_TIMELINE_ENRICHMENT_BATCH_SIZE) {
    const timelineIdsBatch = exportedIds.slice(
      index,
      index + EXPORT_TIMELINE_ENRICHMENT_BATCH_SIZE
    );
    const [batchNotes, batchPinnedEvents] = await Promise.all([
      Promise.all(
        timelineIdsBatch.map((timelineId) => noteLib.getNotesByTimelineId(request, timelineId))
      ),
      Promise.all(
        timelineIdsBatch.map((timelineId) =>
          pinnedEventLib.getAllPinnedEventsByTimelineId(request, timelineId)
        )
      ),
    ]);
    notes.push(...batchNotes.flat());
    pinnedEvents.push(...batchPinnedEvents.flat());
  }

  return { notes, pinnedEvents };
};

const getTimelinesFromObjects = async (
  request: FrameworkRequest,
  ids?: string[] | null
): Promise<Array<TimelineResponse | ExportTimelineNotFoundError>> => {
  const { timelines, errors } = await getSelectedTimelines(request, ids);
  const exportedIds = timelines.map((t) => t.savedObjectId);
  const timelinesById = new Map(timelines.map((timeline) => [timeline.savedObjectId, timeline]));

  const { notes, pinnedEvents } = await getTimelineNotesAndPinnedEvents(request, exportedIds);

  const myResponse = exportedIds.reduce<TimelineResponse[]>((acc, timelineId) => {
    const myTimeline = timelinesById.get(timelineId);
    if (myTimeline != null) {
      const timelineNotes = notes.filter((n) => n.timelineId === timelineId);
      const timelinePinnedEventIds = pinnedEvents.filter((p) => p.timelineId === timelineId);
      const exportedTimeline = omit(['status', 'excludedRowRendererIds'], myTimeline);
      return [
        ...acc,
        {
          ...exportedTimeline,
          ...getGlobalEventNotesByTimelineId(timelineNotes),
          pinnedEventIds: getPinnedEventsIdsByTimelineId(timelinePinnedEventIds),
        },
      ];
    }
    return acc;
  }, []);

  return [...myResponse, ...errors];
};

export const getExportTimelineByObjectIds = async ({
  frameworkRequest,
  ids,
}: {
  frameworkRequest: FrameworkRequest;
  ids?: string[] | null;
}) => {
  const timeline = await getTimelinesFromObjects(frameworkRequest, ids);
  return transformDataToNdjson(timeline);
};
