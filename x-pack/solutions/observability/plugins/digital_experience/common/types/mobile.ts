/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FacetBucket, SessionTimelineEvent } from '../sessions';
import type { ComparedValue, HistogramBuckets, MobilePlatform } from './applications';

/** A release's totals over the time range; `OTHER_RELEASE_KEY` for "Other". */
export interface MobileReleaseRow {
  release: string;
  isOther: boolean;
  sessions: number;
  users: number;
  /** Exceptions per session; `null` below the session floor. */
  errorRate: number | null;
}

export interface MobileReleasePoint {
  /** Start of the bucket, in epoch milliseconds. */
  timestamp: number;
  sessions: number;
  /** Exceptions per session in the bucket; `null` below `MIN_BUCKET_SESSIONS`. */
  errorRate: number | null;
}

export interface MobileReleaseSeries {
  release: string;
  isOther: boolean;
  points: MobileReleasePoint[];
}

export interface MobileReleaseMarker {
  release: string;
  /** Epoch milliseconds. */
  firstSeen: number;
}

/** The release health of a mobile application. */
export interface MobileReleasesResponse {
  histogram: HistogramBuckets;
  /** The top releases by sessions, then "Other" when more have data. */
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

/** When a crash group first or last crashed, and on which release. */
export interface CrashGroupSeen {
  /** ISO 8601. */
  time: string;
  release: string | null;
}

/** Crashes that share a fingerprint: the same crash, whatever build or launch reported it. */
export interface MobileCrashGroup {
  fingerprint: string;
  type: string | null;
  /** The latest crash's. */
  message: string | null;
  /** Installations that crashed, so a device stuck in a crash loop counts once. */
  users: number;
  events: number;
  sessions: number;
  firstSeen: CrashGroupSeen;
  lastSeen: CrashGroupSeen;
  /** The newest release, when no older release crashed this way in the lookback; `null` otherwise. */
  newInRelease: string | null;
}

export interface MobileCrashGroupsResponse {
  /** Most affected users first. */
  crashGroups: MobileCrashGroup[];
  /** Whether the user can't read every OTel logs index, so the values may be missing some data. */
  isPartial: boolean;
}

/** The most frequent values, and how many crashes had any other or none. */
export interface CrashBreakdown {
  top: FacetBucket[];
  other: number;
}

export interface MobileCrash {
  /** ISO 8601, when it happened rather than when the next launch sent it. */
  time: string;
  type: string | null;
  message: string | null;
  stacktrace: string | null;
  release: string | null;
  sessionId: string | null;
}

export interface MobileCrashGroupDetailResponse {
  /** `null` when the group has no crash in the range and filters. */
  latestCrash: MobileCrash | null;
  releases: CrashBreakdown;
  osVersions: CrashBreakdown;
  deviceModels: CrashBreakdown;
  /** The latest crash's session up to the crash, oldest first; empty without a session. */
  beforeCrash: SessionTimelineEvent[];
  isPartial: boolean;
}
