/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout-security';

export interface CompleteTimeline {
  title: string;
  description: string;
  query: string;
  filter?: { field: string; operator: string; value?: string };
  dataViewId?: string;
  indexNames?: string[];
}

export const getDefaultTimeline = (): CompleteTimeline => ({
  title: `Security Timeline ${Date.now()}`,
  description: 'This is the best timeline',
  query: 'host.name: *',
  filter: { field: 'host.name', operator: 'exists', value: 'exists' },
});

export interface PatchTimelineResponse {
  savedObjectId: string;
  version: string;
  createdBy?: string;
  [key: string]: unknown;
}

export interface GetTimelinesResponse {
  timeline: Array<{ savedObjectId: string; [key: string]: unknown }>;
}

/**
 * Creates a timeline saved object via API.
 */
export async function createTimeline(
  kbnClient: KbnClient,
  timeline: CompleteTimeline = getDefaultTimeline()
): Promise<PatchTimelineResponse> {
  const response = await kbnClient.request<PatchTimelineResponse>({
    method: 'POST',
    path: '/api/timeline',
    body: {
      timeline: {
        columns: [
          { id: '@timestamp' },
          { id: 'user.name' },
          { id: 'event.category' },
          { id: 'event.action' },
          { id: 'host.name' },
          { id: 'message' },
        ],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: {
            kuery: {
              expression: timeline.query,
              kind: 'kuery',
            },
          },
        },
        dateRange: {
          end: '2023-04-01T12:22:56.000Z',
          start: '2018-01-01T12:22:56.000Z',
        },
        description: timeline.description,
        title: timeline.title,
        savedQueryId: null,
        ...(timeline.dataViewId != null &&
        timeline.indexNames != null && {
          dataViewId: timeline.dataViewId,
          indexNames: timeline.indexNames,
        }),
      },
    },
    headers: {
      'kbn-xsrf': 'scout-creds',
      'x-elastic-internal-origin': 'security-solution',
    },
  });
  return response.data;
}

/**
 * Creates a timeline template saved object via API.
 */
export async function createTimelineTemplate(
  kbnClient: KbnClient,
  timeline: CompleteTimeline = getDefaultTimeline()
): Promise<PatchTimelineResponse> {
  const response = await kbnClient.request<PatchTimelineResponse>({
    method: 'POST',
    path: '/api/timeline',
    body: {
      timeline: {
        columns: [
          { id: '@timestamp' },
          { id: 'user.name' },
          { id: 'event.category' },
          { id: 'event.action' },
          { id: 'host.name' },
        ],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: {
            kuery: {
              expression: timeline.query,
              kind: 'kuery',
            },
          },
        },
        dateRange: {
          end: '1577881376000',
          start: '1514809376000',
        },
        description: timeline.description,
        title: timeline.title,
        templateTimelineVersion: 1,
        timelineType: 'template',
        savedQueryId: null,
      },
    },
    headers: {
      'kbn-xsrf': 'scout-creds',
      'x-elastic-internal-origin': 'security-solution',
      'elastic-api-version': '2023-10-31',
    },
  });
  return response.data;
}

/**
 * Deletes all timelines via API.
 */
export async function deleteTimelines(kbnClient: KbnClient): Promise<void> {
  try {
    const response = await kbnClient.request<GetTimelinesResponse>({
      method: 'GET',
      path: '/api/timelines',
      query: {
        page_size: '100',
        page_index: '1',
        sort_field: 'updated',
        sort_order: 'desc',
        timeline_type: 'default',
      },
    });

    const savedObjectIds = response.data?.timeline?.map((t) => t.savedObjectId) ?? [];
    if (savedObjectIds.length > 0) {
      await kbnClient.request({
        method: 'DELETE',
        path: '/api/timeline',
        body: { savedObjectIds },
      });
    }
  } catch {
    // Cleanup best-effort; ignore errors
  }
}

/**
 * Adds a note to a timeline via API.
 */
export async function addNoteToTimeline(
  kbnClient: KbnClient,
  note: string,
  timelineId: string
): Promise<void> {
  await kbnClient.request({
    method: 'PATCH',
    path: '/api/note',
    body: {
      noteId: null,
      version: null,
      note: { note, timelineId },
    },
    headers: {
      'kbn-xsrf': 'scout-creds',
      'x-elastic-internal-origin': 'security-solution',
      'elastic-api-version': '2023-10-31',
    },
  });
}
