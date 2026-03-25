/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { Logger } from '@kbn/logging';
import type { SavedTimeline } from '../../../common/api/timeline';
import { TimelineStatusEnum, TimelineTypeEnum } from '../../../common/api/timeline';
import { createTimeline } from '../../lib/timeline/saved_object/timelines';
import { savePinnedEvents } from '../../lib/timeline/saved_object/pinned_events';
import type { FrameworkRequest } from '../../lib/framework';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { DEFAULT_ALERTS_INDEX } from '../../../common/constants';
import { securityTool } from './constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

const timelineCreateSchema = z.object({
  title: z.string().min(1).max(256).describe('The title for the investigation timeline'),
  description: z
    .string()
    .optional()
    .describe('Optional description providing context for the timeline investigation'),
  event_ids: z
    .array(z.string().max(255))
    .min(1)
    .max(100)
    .describe('Array of event or alert IDs to pin to the timeline for investigation'),
  index_pattern: z
    .string()
    .optional()
    .describe(
      'Index pattern to search for events. Defaults to .alerts-security.alerts-* if not provided.'
    ),
});

export const SECURITY_TIMELINE_CREATE_TOOL_ID = securityTool('timeline_create');

export const timelineCreateTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof timelineCreateSchema> => {
  return {
    id: SECURITY_TIMELINE_CREATE_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Create or update an investigation timeline from event data. Pins specified events to the timeline for investigation context.',
    schema: timelineCreateSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (
      { title, description, event_ids: eventIds, index_pattern: indexPattern },
      { esClient, spaceId, request, savedObjectsClient }
    ) => {
      logger.debug(
        `${SECURITY_TIMELINE_CREATE_TOOL_ID} tool called with title: ${title}, eventIds: ${JSON.stringify(
          eventIds
        )}`
      );

      try {
        const searchIndex = indexPattern ?? `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

        // Verify that the specified events exist
        const verifyResponse = await esClient.asCurrentUser.search({
          index: searchIndex,
          ignore_unavailable: true,
          allow_no_indices: true,
          size: eventIds.length,
          _source: false,
          query: {
            bool: {
              filter: [{ terms: { _id: eventIds } }],
            },
          },
        });

        const foundIds = verifyResponse.hits.hits
          .map((hit) => hit._id)
          .filter((id): id is string => id !== undefined);

        const missingIds = eventIds.filter((id) => !foundIds.includes(id));

        if (foundIds.length === 0) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: {
                  message: `None of the specified event IDs were found in index ${searchIndex}`,
                },
              },
            ],
          };
        }

        // Create the timeline using the Timeline API service
        const timelineData: SavedTimeline = {
          title,
          description: description ?? '',
          status: TimelineStatusEnum.active,
          timelineType: TimelineTypeEnum.default,
          templateTimelineId: null,
          templateTimelineVersion: null,
          columns: [
            { columnHeaderType: 'not-filtered', id: '@timestamp' },
            { columnHeaderType: 'not-filtered', id: 'message' },
            { columnHeaderType: 'not-filtered', id: 'event.category' },
            { columnHeaderType: 'not-filtered', id: 'event.action' },
            { columnHeaderType: 'not-filtered', id: 'host.name' },
            { columnHeaderType: 'not-filtered', id: 'source.ip' },
            { columnHeaderType: 'not-filtered', id: 'destination.ip' },
            { columnHeaderType: 'not-filtered', id: 'user.name' },
          ],
          dataProviders: [],
          dateRange: {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
          excludedRowRendererIds: [],
          favorite: [],
          filters: [],
          indexNames: [searchIndex],
          kqlMode: 'filter',
          kqlQuery: { filterQuery: null },
          sort: [{ columnId: '@timestamp', columnType: 'date', sortDirection: 'desc' }],
        };

        const timelineResponse = await createTimeline({
          timelineId: null,
          timeline: timelineData,
          savedObjectsClient,
          userInfo: null,
        });

        const timelineId = timelineResponse.timeline.savedObjectId;

        // Pin events to the timeline using the Timeline API service.
        // savePinnedEvents requires a FrameworkRequest, so we construct a
        // compatible wrapper that provides the savedObjectsClient and user
        // through the expected context.core resolution path.
        const frameworkRequest = {
          body: request.body,
          user: null,
          context: {
            core: Promise.resolve({
              savedObjects: { client: savedObjectsClient },
            }),
          },
        } as unknown as FrameworkRequest;

        await savePinnedEvents(frameworkRequest, timelineId, foundIds);

        // Build the deep link URL for the timeline
        const timelineUrl = `/app/security/timelines?timeline=(id:'${timelineId}',isOpen:!t)`;

        logger.debug(
          `Successfully created timeline "${title}" with ID: ${timelineId}, pinned ${foundIds.length} events`
        );

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                timeline_id: timelineId,
                title,
                description: description ?? '',
                pinned_events: foundIds.length,
                missing_events: missingIds.length > 0 ? missingIds : undefined,
                url: timelineUrl,
                message: `Timeline "${title}" created successfully with ${
                  foundIds.length
                } pinned events.${
                  missingIds.length > 0
                    ? ` ${missingIds.length} event(s) were not found and were skipped.`
                    : ''
                }`,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in ${SECURITY_TIMELINE_CREATE_TOOL_ID} tool: ${errorMessage}`);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Error creating timeline: ${errorMessage}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'timeline', 'investigation'],
  };
};
