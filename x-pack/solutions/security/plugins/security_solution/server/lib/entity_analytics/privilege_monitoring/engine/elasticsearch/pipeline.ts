/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';

export const PRIVMON_EVENT_INGEST_PIPELINE_ID = 'ea-privmon-event-ingested';

export const eventIngestPipeline: IngestPutPipelineRequest = {
  id: PRIVMON_EVENT_INGEST_PIPELINE_ID,
  _meta: {
    managed_by: 'ea_privilege_user_monitoring',
    managed: true,
  },
  description: 'Add event.ingested field to privileged user monitoring events',
  processors: [
    {
      set: {
        field: 'event.ingested',
        value: '{{_ingest.timestamp}}',
      },
    },
  ],
  on_failure: [
    {
      set: {
        field: 'error.message',
        value: 'Failed to add event.ingested field to privileged user monitoring events',
      },
    },
  ],
};
