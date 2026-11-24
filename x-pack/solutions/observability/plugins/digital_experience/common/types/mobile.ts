/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FacetBucket } from '../sessions';
import type { ComparedValue, HistogramBuckets, MobilePlatform } from './applications';

/** A release's values over the time range; the key is `OTHER_RELEASE_KEY` for the "Other" group. */
export interface MobileReleaseRow {
  release: string;
  isOther: boolean;
  sessions: number;
  users: number;
  /** Exceptions per session; `null` below the session floor. */
  errorRate: number | null;
}

/** A release's values in one bucket of the histogram. */
export interface MobileReleasePoint {
  /** Start of the bucket, in epoch milliseconds. */
  timestamp: number;
  sessions: number;
  /** Exceptions per session in the bucket; `null` without sessions. */
  errorRate: number | null;
}

export interface MobileReleaseSeries {
  release: string;
  isOther: boolean;
  points: MobileReleasePoint[];
}

/** Where a release first appears in the time range. */
export interface MobileReleaseMarker {
  release: string;
  /** Epoch milliseconds. */
  firstSeen: number;
}

/** The release health of a mobile application: its releases, their trends and first appearances. */
export interface MobileReleasesResponse {
  histogram: HistogramBuckets;
  /** The top releases by sessions, then "Other" when more have data; most sessions first. */
  releases: MobileReleaseRow[];
  series: MobileReleaseSeries[];
  /** The top releases first seen in the time range. */
  markers: MobileReleaseMarker[];
}

/** The KPI row of a mobile application's page, each value against the previous period. */
export interface MobileKpisResponse {
  /** Whether the application has mobile data in the time range and filters. */
  hasData: boolean;
  /** Whether the user can't read every OTel index, so the values may be missing some data. */
  isPartial: boolean;
  sessions: ComparedValue;
  users: ComparedValue;
  /** Exceptions per session. */
  errorRate: ComparedValue;
  /** Releases in the time range and OS, whatever the release filter, most sessions first. */
  releases: FacetBucket[];
  /**
   * The resource `os.name` values in the time range with their sessions, whatever the OS and
   * release filters.
   */
  osNames: FacetBucket[];
  /** The platforms in the time range, whatever the OS and release filters, sorted. */
  platforms: MobilePlatform[];
  /** Environments in the time range, whatever the environment filter. */
  environments: string[];
}
