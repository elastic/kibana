/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationSource, ApplicationType, HistogramBuckets } from './applications';

/**
 * The estimated RUM telemetry stored for one application in the time range: its documents in each
 * data stream times that data stream's average stored document size.
 */
export interface ApplicationIngest {
  serviceName: string;
  applicationType: ApplicationType;
  source: ApplicationSource;
  /** Estimated stored bytes, primaries only. */
  bytes: number;
}

/** The estimated stored bytes of one bucket of the histogram. */
export interface IngestPoint {
  /** Start of the bucket, in epoch milliseconds. */
  timestamp: number;
  bytes: number;
}

/** One web application's estimated ingest in each bucket. */
export interface IngestSeries {
  serviceName: string;
  source: ApplicationSource;
  points: IngestPoint[];
}

/**
 * The web applications' estimated ingest over the time range, in the buckets of the Applications
 * list's chart: each source's 10 applications with the most ingest, and the rest of the source.
 */
export interface IngestOverTime {
  histogram: HistogramBuckets;
  series: IngestSeries[];
  /** Per source, the ingest of its applications that are not in `series`. */
  other: Record<ApplicationSource, IngestPoint[]>;
}

export interface ApplicationsIngestResponse {
  /** Every application with an estimate, web and mobile. */
  applications: ApplicationIngest[];
  overTime: IngestOverTime;
  /**
   * Whether the user lacks the `monitor` privilege on some indices, so the size of their documents
   * is unknown and their applications have no or a partial estimate.
   */
  missingPrivileges: boolean;
  /** Whether a search failed, so some applications have no estimate. */
  hasFailures: boolean;
}
