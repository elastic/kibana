/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { i18n } from '@kbn/i18n';
import type { InvestigationSeed } from '@kbn/investigation-seed';
import type { LogSourcesService } from '@kbn/logs-data-access-plugin/common/types';
import type { LogsSharedPluginStart } from '@kbn/logs-shared-plugin/server';
import type { SignalAnalyzerResult } from '@kbn/signal-investigation-contract';

export type ResolvedLogIndex =
  | { kind: 'resolved'; index: string; timeField: string }
  | { kind: 'unavailable' };

const DEFAULT_TIME_FIELD = '@timestamp';

const isSavedObjectNotFound = (error: unknown): boolean =>
  error instanceof Error && SavedObjectsErrorHelpers.isNotFoundError(error);

/** Shown when a saved data view or log view can no longer be loaded. */
export const unavailableDataViewResult = (): SignalAnalyzerResult => ({
  leads: [],
  entities: {},
  status: 'not_set_up',
  message: i18n.translate('xpack.signalInvestigation.logIndex.dataViewUnavailable', {
    defaultMessage: 'The selected data view is unavailable.',
  }),
});

/**
 * Resolves the log index and time field for a seed: the alert's log view, then an explicit
 * index pattern, then a saved data view, then the configured log sources.
 */
export const resolveLogIndex = async ({
  seed,
  dataViews,
  logViews,
  savedObjectsClient,
  esClient,
  request,
  logSourcesService,
}: {
  seed: InvestigationSeed;
  dataViews: DataViewsServerPluginStart;
  logViews?: LogsSharedPluginStart['logViews'];
  savedObjectsClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  request: KibanaRequest;
  logSourcesService: LogSourcesService;
}): Promise<ResolvedLogIndex> => {
  if (seed.origin.app === 'alerts' && seed.origin.logViewId && logViews) {
    try {
      const resolved = await logViews.getScopedClient(request).getResolvedLogView({
        type: 'log-view-reference',
        logViewId: seed.origin.logViewId,
      });
      if (resolved.indices.length > 0) {
        return {
          kind: 'resolved',
          index: resolved.indices,
          timeField: resolved.timestampField || DEFAULT_TIME_FIELD,
        };
      }
    } catch (error) {
      if (!isSavedObjectNotFound(error)) {
        throw error;
      }
    }
    return { kind: 'unavailable' };
  }

  if (seed.indexPattern) {
    return { kind: 'resolved', index: seed.indexPattern, timeField: DEFAULT_TIME_FIELD };
  }

  if (seed.dataViewId) {
    try {
      const service = await dataViews.dataViewsServiceFactory(
        savedObjectsClient,
        esClient,
        request
      );
      const dataView = await service.get(seed.dataViewId);
      const index = dataView.getIndexPattern();
      if (index.length === 0) {
        return { kind: 'unavailable' };
      }
      return {
        kind: 'resolved',
        index,
        timeField: dataView.timeFieldName ?? DEFAULT_TIME_FIELD,
      };
    } catch (error) {
      if (isSavedObjectNotFound(error)) {
        return { kind: 'unavailable' };
      }
      throw error;
    }
  }

  return {
    kind: 'resolved',
    index: await logSourcesService.getFlattenedLogSources(),
    timeField: DEFAULT_TIME_FIELD,
  };
};
