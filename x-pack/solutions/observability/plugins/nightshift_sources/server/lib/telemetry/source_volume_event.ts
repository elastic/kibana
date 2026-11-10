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
  doc_count?: number;
  bytes_estimated?: number;
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
                'ok, partial, error or timeout. partial: the query ran but some clusters or shards did not answer, so doc_count is a lower bound. doc_count is set when ok or partial; bytes_estimated only when ok',
            },
          },
          has_remote: {
            type: 'boolean',
            _meta: {
              description:
                'The source also reads a remote cluster, whose documents are in doc_count and priced at the local average',
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
          bytes_estimated: {
            type: 'long',
            _meta: {
              optional: true,
              description:
                'Estimate: doc_count times the average document size of the local indices the source reads; that average is extrapolated to linked-project and remote documents, whose size cannot be read. Absent when no local index exists or its size could not be read',
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
