/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { FieldDescription } from '../installation/types';

interface Options {
  enrichField: string;
}

export type FieldRetentionOperatorBuilder = (
  field: FieldDescription,
  options: Options
) => IngestProcessorContainer;
