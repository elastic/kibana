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
  coreStart,
  pluginStart,
  request,
  startAsDatemath,
  endAsDatemath,
  modelProvider,
  logger,
  query,
}: {
  coreStart: CoreStart;
  pluginStart: ObservabilityAgentPluginStartDependencies;
  request: KibanaRequest;
  startAsDatemath: string;
  endAsDatemath: string;
  modelProvider: ModelProvider;
  logger: Logger;
  query: string;
}): Promise<string[]> {
  const esClientInternal = coreStart.elasticsearch.client.asInternalUser;

  const hasAnyHitsResponse = await esClientInternal.search({
    index: ['.alerts-observability*'],
    _source: false,
    track_total_hits: 1,
    terminate_after: 1,
  });

  const hitCount =
    typeof hasAnyHitsResponse.hits.total === 'number'
      ? hasAnyHitsResponse.hits.total
      : hasAnyHitsResponse.hits.total?.value ?? 0;

  const includeEmptyFields = hitCount === 0;

  const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
  const dataViewsService = await pluginStart.dataViews.dataViewsServiceFactory(
    savedObjectsClient,
    esClientInternal
  );

  const fieldsForWildcard = await dataViewsService.getFieldsForWildcard({
    pattern: '.alerts-observability*',
    allowNoIndex: true,
    includeEmptyFields,
    indexFilter: {
      range: {
        '@timestamp': {
          gte: datemath.parse(startAsDatemath)!.toISOString(),
          lt: datemath.parse(endAsDatemath)!.toISOString(),
        },
      },
    },
  });

  const allFields = fieldsForWildcard.flatMap((field) => {
    const types = field.esTypes ?? [field.type];
    return types.map((type) => ({ name: field.name, type }));
  });

  const fieldNames = uniq(allFields.map((f) => f.name));
  const groupedFields = groupBy(allFields, (f) => f.name);

  const selectedNames = await selectRelevantAlertFields({
    modelProvider,
    candidateFieldNames: fieldNames,
    logger,
    query,
  });

  const selectedFields = selectedNames.map((field) => {
    const desc = groupedFields[field] ?? [];
    const types = desc.map((d) => d.type).join(',');
    return types ? `${field}:${types}` : field;
  });

  return selectedFields;
}
