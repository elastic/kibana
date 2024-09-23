/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ToolingLog } from '@kbn/tooling-log';

interface UpdateMappingsProps {
  es: Client;
  index: string | string[];
}

export const setSyntheticSource = async ({ es, index }: UpdateMappingsProps) => {
  await es.indices.putMapping({ _source: { mode: 'synthetic' }, index });
};
