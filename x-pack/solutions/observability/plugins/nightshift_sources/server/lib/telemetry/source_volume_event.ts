/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, EventTypeOpts } from '@kbn/core/server';
import type { SourceType } from '@kbn/nightshift-shared';

export const SOURCE_VOLUME_EVENT_TYPE = 'nightshift-sources-daily-volume';

export type SourceVolumeStatus = 'ok' | 'partial' | 'error' | 'timeout';

export interface SourceVolume {
  status: SourceVolumeStatus;
  has_remote: boolean;
  has_filter: boolean;
  doc_count?: number;
  json_bytes_estimated?: number;
  disk_bytes_estimated?: number;
  metered_bytes_estimated?: number;
  clusters_total?: number;
  clusters_unsuccessful?: number;
  error?: string;
}

export interface SourceVolumeEntry extends SourceVolume {
  space_id: string;
  source_id: string;
  source_type: SourceType;
  enabled: boolean;
}

export interface SourceVolumePayload {
  window_start: string;
  window_end: string;
  sources: SourceVolumeEntry[];
}

export const sourceVolumeEventType: EventTypeOpts<SourceVolumePayload> = {
  eventType: SOURCE_VOLUME_EVENT_TYPE,
  schema: {
    window_start: {
      type: 'date',
      _meta: { description: 'Start of the measured window (ISO 8601)' },
    },
    window_end: {
      type: 'date',
      _meta: { description: 'End of the measured window (ISO 8601); the window is 24 hours' },
    },
    sources: {
      type: 'array',
      items: {
        properties: {
          space_id: {
            type: 'keyword',
            _meta: { description: 'Kibana space that owns the source' },
          },
          source_id: {
            type: 'keyword',
            _meta: { description: 'Saved object id of the source; stable across runs' },
          },
          source_type: {
            type: 'keyword',
            _meta: {
              description: 'Kind of data the source reads: logs, metrics, traces or unknown',
            },
          },
          enabled: {
            type: 'boolean',
            _meta: { description: 'Whether the source is enabled' },
          },
          status: {
            type: 'keyword',
            _meta: {
              description:
                'ok, partial, error or timeout. partial: the query ran but some clusters or shards did not answer, so doc_count and the byte estimates extrapolated from it are lower bounds. doc_count and the byte estimates are set when ok or partial',
            },
          },
          has_remote: {
            type: 'boolean',
            _meta: {
              description:
                'The source also reads a remote cluster, whose documents are in doc_count and, in disk_bytes_estimated and metered_bytes_estimated, priced at the local average',
            },
          },
          has_filter: {
            type: 'boolean',
            _meta: {
              description:
                'The source query has a WHERE clause. doc_count and json_bytes_estimated apply it; disk_bytes_estimated and metered_bytes_estimated use an average over every document of the indices, so they are off by however much the matched documents differ in size from that average',
            },
          },
          doc_count: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'Documents matched by the source query within the window, including linked projects under cross-project search and remote clusters. A lower bound when status is partial',
            },
          },
          json_bytes_estimated: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'Estimate of the JSON size of the documents: doc_count times the average _source size of a random sample of about 10000 documents the source query matched within the window, local or remote. On synthetic-source indices the size is of the rebuilt JSON. Absent when _source could not be sampled, for instance a source over a view',
            },
          },
          disk_bytes_estimated: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'Stateful only. Estimate of the on-disk size: doc_count times the average on-disk document size of the local indices the source reads, taken over every document of those indices, not only the ones the query matched in the window; that average is extrapolated to remote documents, whose size cannot be read. Absent on serverless, when no local index exists (a remote-only source) or when its size could not be read',
            },
          },
          metered_bytes_estimated: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'Serverless only. Estimate of the metered size: doc_count times the average metered document size of the local indices the source reads, taken over every document of those indices, not only the ones the query matched in the window. The metered size of a document is the size of its field values, without field names or JSON structure and without the root fields metering excludes; it is neither an on-disk size nor derivable from json_bytes_estimated. The average is extrapolated to linked-project documents, whose size cannot be read. Absent on stateful, when no local index exists or when its size could not be read',
            },
          },
          clusters_total: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'Clusters or linked projects the query fanned out to; only set for a cross-cluster query',
            },
          },
          clusters_unsuccessful: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'Of clusters_total, the ones that were skipped, failed or answered partially; only set for a cross-cluster query',
            },
          },
          error: {
            type: 'keyword',
            _meta: {
              optional: true,
              description: 'Elasticsearch error type, or "timeout", when status is not ok',
            },
          },
        },
      },
      _meta: {
        description:
          'One entry per configured source across every space. Each source is measured on its own query, so sources with overlapping index patterns count the same documents more than once; summing across sources can double count',
      },
    },
  },
};

export const registerSourceVolumeEvent = (analytics: AnalyticsServiceSetup): void => {
  analytics.registerEventType(sourceVolumeEventType);
};
