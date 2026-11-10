/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import type { WikiEditAction, WikiEntityType } from '../../common/wiki';
import {
  wikiEditAppliedEventType,
  wikiHydratedEventType,
  NIGHTSHIFT_WIKI_EDIT_APPLIED_EVENT_TYPE,
  NIGHTSHIFT_WIKI_HYDRATED_EVENT_TYPE,
  type WikiEditAppliedProps,
  type WikiHydratedProps,
} from './wiki_events';

/** An edit the optimizer actually wrote — proposals that matched no page are excluded. */
export interface AppliedWikiEdit {
  action: WikiEditAction;
  entityType: WikiEntityType;
}

export interface WikiTelemetry {
  reportHydrated: (pages: ReadonlyArray<{ entity_type: WikiEntityType }>) => void;
  reportEditsApplied: (edits: readonly AppliedWikiEdit[]) => void;
}

export const registerWikiTelemetryEvents = (analytics: AnalyticsServiceSetup): void => {
  analytics.registerEventType(wikiHydratedEventType);
  analytics.registerEventType(wikiEditAppliedEventType);
};

/**
 * Binds the ids of one investigator round to the Wiki events emitted during it. Events are
 * bucketed rather than emitted per page or per edit so a large wiki cannot flood the pipeline.
 */
export const createWikiTelemetry = ({
  analytics,
  conversationId,
  roundId,
  logger,
}: {
  analytics: AnalyticsServiceSetup;
  conversationId?: string;
  roundId?: string;
  logger: Logger;
}): WikiTelemetry => {
  // Liquid renders an absent workflow input as an empty string, so falsy ids are dropped rather
  // than reported as empty keywords.
  const runIds = {
    ...(conversationId ? { conversation_id: conversationId } : {}),
    ...(roundId ? { round_id: roundId } : {}),
  };

  // Measuring the wiki must never cost the agent the wiki, so a reporting failure is swallowed.
  // `reportEvent` throws on an unregistered event type, and in dev also on a payload the
  // registered schema rejects.
  const report = (emit: () => void): void => {
    try {
      emit();
    } catch (error) {
      logger.debug(`Failed to report Wiki telemetry: ${error}`);
    }
  };

  return {
    reportHydrated: (pages) => {
      const pageCounts = new Map<WikiEntityType, number>();
      for (const { entity_type: entityType } of pages) {
        pageCounts.set(entityType, (pageCounts.get(entityType) ?? 0) + 1);
      }

      // An empty wiki still means the agent was hydrated, and that is the signal worth watching
      // while Wiki fills up, so it gets an event of its own instead of silence.
      if (pageCounts.size === 0) {
        report(() =>
          analytics.reportEvent<WikiHydratedProps>(NIGHTSHIFT_WIKI_HYDRATED_EVENT_TYPE, {
            ...runIds,
            page_count: 0,
          })
        );
        return;
      }

      for (const [entityType, pageCount] of pageCounts) {
        report(() =>
          analytics.reportEvent<WikiHydratedProps>(NIGHTSHIFT_WIKI_HYDRATED_EVENT_TYPE, {
            ...runIds,
            entity_type: entityType,
            page_count: pageCount,
          })
        );
      }
    },

    reportEditsApplied: (edits) => {
      const editCounts = new Map<string, AppliedWikiEdit & { count: number }>();
      for (const { action, entityType } of edits) {
        const key = `${action}:${entityType}`;
        const bucket = editCounts.get(key);
        if (bucket) {
          bucket.count += 1;
          continue;
        }
        editCounts.set(key, { action, entityType, count: 1 });
      }

      for (const { action, entityType, count } of editCounts.values()) {
        report(() =>
          analytics.reportEvent<WikiEditAppliedProps>(NIGHTSHIFT_WIKI_EDIT_APPLIED_EVENT_TYPE, {
            ...runIds,
            action,
            entity_type: entityType,
            edit_count: count,
          })
        );
      }
    },
  };
};
