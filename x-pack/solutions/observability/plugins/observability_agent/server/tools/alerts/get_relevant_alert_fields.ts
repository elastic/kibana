/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import type { Logger } from '@kbn/core/server';
import type { CoreStart } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { groupBy, uniq } from 'lodash';
import type { ModelProvider } from '@kbn/onechat-server';
import type { ObservabilityAgentPluginStartDependencies } from '../../types';
import { selectRelevantAlertFields } from './select_relevant_alert_fields';

export async function getRelevantAlertFields({
  query,
  start,
  end,
  coreStart,
  pluginStart,
  request,
  modelProvider,
  logger,
}: {
  query: string;
  start?: string;
  end?: string;
  coreStart: CoreStart;
  pluginStart: ObservabilityAgentPluginStartDependencies;
  request: KibanaRequest;
  modelProvider: ModelProvider;
  logger: Logger;
}): Promise<string[]> {
  const esClient = coreStart.elasticsearch.client.asInternalUser;
  const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
  const dataViewsService = await pluginStart.dataViews.dataViewsServiceFactory(
    savedObjectsClient,
    esClient
  );

  const hasAnyHitsResponse = await esClient.search({
    index: '.alerts-observability*',
    _source: false,
    track_total_hits: 1,
    terminate_after: 1,
  });

  const hitCount =
    typeof hasAnyHitsResponse.hits.total === 'number'
      ? hasAnyHitsResponse.hits.total
      : hasAnyHitsResponse.hits.total?.value ?? 0;

  // all fields are empty in this case, so get them all
  const includeEmptyFields = hitCount === 0;

  const fieldsForWildcard = await dataViewsService.getFieldsForWildcard({
    pattern: '.alerts-observability*',
    allowNoIndex: true,
    includeEmptyFields,
    indexFilter:
      start && end
        ? {
            range: {
              '@timestamp': {
                gte: datemath.parse(start)!.toISOString(),
                lt: datemath.parse(end)!.toISOString(),
              },
            },
          }
        : undefined,
  });

  const allFields = fieldsForWildcard.flatMap((field) => {
    const types = field.esTypes ?? [field.type];
    return types.map((type) => ({ name: field.name, type }));
  });

  const fieldNames = uniq(allFields.map((field) => field.name));
  const groupedFields = groupBy(allFields, (field) => field.name);

  const selectedFieldNames = await selectRelevantAlertFields({
    query,
    candidateFieldNames: fieldNames,
    logger,
    modelProvider,
  });

  const selectedFields = selectedFieldNames.map((field) => {
    const desc = groupedFields[field] ?? [];
    const types = desc.map((d) => d.type).join(',');
    return types ? `${field}:${types}` : field;
  });

  return selectedFields;
}
