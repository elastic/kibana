/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger, ScoutParallelWorkerFixtures } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';

const TIMELINE_URL = '/api/timeline';
const TIMELINES_URL = '/api/timelines';

const DEFAULT_COLUMNS = [
  { id: '@timestamp' },
  { id: 'user.name' },
  { id: 'event.category' },
  { id: 'event.action' },
  { id: 'host.name' },
];

const DEFAULT_DATE_RANGE = {
  start: '2018-01-01T12:22:56.000Z',
  end: '2023-04-01T12:22:56.000Z',
};

export interface TimelineInput {
  title: string;
  description?: string;
  query?: string;
}

export interface TimelineApiService {
  createTimeline: (input?: Partial<TimelineInput>) => Promise<string>;
  createTimelineTemplate: (input?: Partial<TimelineInput>) => Promise<string>;
  deleteAll: () => Promise<void>;
}

interface CreateTimelineApiResponse {
  savedObjectId: string;
}

interface GetTimelinesApiResponse {
  timeline: Array<{ savedObjectId: string }>;
}

const DEFAULT_TIMELINE: TimelineInput = {
  title: 'Security Timeline',
  description: 'This is the best timeline',
  query: 'host.name: *',
};

const buildTimelineBody = (
  timeline: TimelineInput,
  options: { columns: Array<{ id: string }>; timelineType?: string; templateVersion?: number }
) => ({
  timeline: {
    columns: options.columns,
    kqlMode: 'filter',
    kqlQuery: {
      filterQuery: {
        kuery: { expression: timeline.query ?? '', kind: 'kuery' },
      },
    },
    dateRange: DEFAULT_DATE_RANGE,
    description: timeline.description ?? '',
    title: timeline.title,
    savedQueryId: null,
    ...(options.timelineType && { timelineType: options.timelineType }),
    ...(options.templateVersion && { templateTimelineVersion: options.templateVersion }),
  },
});

export const getTimelineApiService = ({
  kbnClient,
  log,
  scoutSpace,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
  scoutSpace?: ScoutParallelWorkerFixtures['scoutSpace'];
}): TimelineApiService => {
  const basePath = scoutSpace?.id ? `/s/${scoutSpace.id}` : '';

  const fetchAllSavedObjectIds = async (timelineType: string): Promise<string[]> => {
    const response = await kbnClient.request<GetTimelinesApiResponse>({
      method: 'GET',
      path: `${basePath}${TIMELINES_URL}?page_size=1000&page_index=1&sort_field=updated&sort_order=desc&timeline_type=${timelineType}`,
    });

    return (response.data?.timeline ?? []).map((t) => t.savedObjectId);
  };

  return {
    createTimeline: async (input = {}) => {
      const timeline = { ...DEFAULT_TIMELINE, ...input };

      return measurePerformanceAsync(log, 'security.timeline.createTimeline', async () => {
        const response = await kbnClient.request<CreateTimelineApiResponse>({
          method: 'POST',
          path: `${basePath}${TIMELINE_URL}`,
          body: buildTimelineBody(timeline, {
            columns: [...DEFAULT_COLUMNS, { id: 'message' }],
          }),
        });

        return response.data.savedObjectId;
      });
    },

    createTimelineTemplate: async (input = {}) => {
      const timeline = { ...DEFAULT_TIMELINE, ...input };

      return measurePerformanceAsync(log, 'security.timeline.createTimelineTemplate', async () => {
        const response = await kbnClient.request<CreateTimelineApiResponse>({
          method: 'POST',
          path: `${basePath}${TIMELINE_URL}`,
          body: buildTimelineBody(timeline, {
            columns: DEFAULT_COLUMNS,
            timelineType: 'template',
            templateVersion: 1,
          }),
        });

        return response.data.savedObjectId;
      });
    },

    deleteAll: async () => {
      await measurePerformanceAsync(log, 'security.timeline.deleteAll', async () => {
        const [defaultIds, templateIds] = await Promise.all([
          fetchAllSavedObjectIds('default'),
          fetchAllSavedObjectIds('template'),
        ]);

        const allIds = [...defaultIds, ...templateIds];
        if (allIds.length === 0) {
          return;
        }

        await kbnClient.request({
          method: 'DELETE',
          path: `${basePath}${TIMELINE_URL}`,
          body: { savedObjectIds: allIds },
        });
      });
    },
  };
};
