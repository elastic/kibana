/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../functional/ftr_provider_context';
import { IngestPipelinesAPIProvider } from '../apis/management/ingest_pipelines/lib/api';
import { IngestPipelinesFixturesProvider } from '../apis/management/ingest_pipelines/lib/fixtures';

export function IngestPipelinesProvider(context: FtrProviderContext) {
  const api = IngestPipelinesAPIProvider(context);
  const fixtures = IngestPipelinesFixturesProvider();

  return {
    api,
    fixtures,
  };
}
