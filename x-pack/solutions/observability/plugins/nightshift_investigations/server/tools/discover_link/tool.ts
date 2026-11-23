/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';

export const DISCOVER_LINK_TOOL_ID = 'nightshift_discover_link';

const MAX_QUERY_LENGTH = 10_000;
const MAX_TIME_LENGTH = 100;

export interface DiscoverLinkLocatorParams extends SerializableRecord {
  query: { esql: string };
  timeRange?: { from: string; to: string };
}

export type DiscoverLinkLocator = Pick<LocatorPublic<DiscoverLinkLocatorParams>, 'getRedirectUrl'>;

const discoverLinkSchema = lazySchema(() =>
  z.object({
    query: z.string().min(1).max(MAX_QUERY_LENGTH).describe('The ES|QL query to open.'),
    start: z
      .string()
      .max(MAX_TIME_LENGTH)
      .describe(
        'Start of the time window the query covers, as an ISO 8601 time, or date math such as `now-1h` when the user asked for a window relative to now. Discover filters on this window on top of the query, and uses the last 15 minutes when none is given.'
      ),
    end: z
      .string()
      .max(MAX_TIME_LENGTH)
      .optional()
      .describe('End of the time window, in the same format as `start`. Defaults to `now`.'),
  })
);

export const createDiscoverLinkTool = ({
  getDiscoverLocator,
  getKibanaUrl,
}: {
  getDiscoverLocator: () => DiscoverLinkLocator | undefined;
  getKibanaUrl: () => string | undefined;
}): BuiltinToolDefinition<typeof discoverLinkSchema> => ({
  id: DISCOVER_LINK_TOOL_ID,
  type: ToolType.builtin,
  description: `Builds a link that opens an ES|QL query in Discover on this deployment.

Use it when the user asks for a Discover link to a query. Write the returned url as a Markdown link, such as [Open in Discover](<url>), never as a bare URL and never one you build yourself.

The link opens this deployment's data only. Use it only for a query on local indices through the "Local Elasticsearch" connector. For any other connector, a \`remote:\` index, or when this tool fails, give the query instead.`,
  tags: ['investigation'],
  schema: discoverLinkSchema,
  annotations: {
    title: 'Discover link',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  excludeFromMcp: true,
  handler: async ({ query, start, end }, { spaceId }) => {
    const locator = getDiscoverLocator();
    const kibanaUrl = getKibanaUrl();
    if (!locator || !kibanaUrl) {
      return {
        results: [
          createErrorResult(
            'Discover links are unavailable: this deployment has no Discover or no public Kibana URL. Give the query instead.'
          ),
        ],
      };
    }
    const path = locator.getRedirectUrl(
      { query: { esql: query }, timeRange: { from: start, to: end ?? 'now' } },
      { spaceId }
    );
    return {
      results: [{ type: ToolResultType.other, data: { url: new URL(path, kibanaUrl).toString() } }],
    };
  },
});
