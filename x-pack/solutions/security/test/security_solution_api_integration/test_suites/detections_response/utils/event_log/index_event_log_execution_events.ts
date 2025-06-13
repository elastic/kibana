/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';

/**
 * Indexes provided execution events into .kibana-event-log-*
 * @param es The ElasticSearch handle
 * @param log The tooling logger
 * @param events
 */
export const indexEventLogExecutionEvents = async (
  es: Client,
  log: ToolingLog,
  events: object[]
): Promise<void> => {
  const response = await es.indices.getDataStream({
    name: `.kibana-event-log-*`,
    expand_wildcards: 'all',
  });
  const operations = events.flatMap((doc: object) => [{ create: {} }, doc]);

  await es.bulk({
    index: response.data_streams[0].name,
    refresh: true,
    operations,
  });

  return;
};
