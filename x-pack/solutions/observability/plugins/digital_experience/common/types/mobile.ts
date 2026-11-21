/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComparedValue, MobilePlatform } from './applications';

/** The KPI row of a mobile application's page, each value against the previous period. */
export interface MobileKpisResponse {
  /** Whether the application has mobile data in the time range and filters. */
  hasData: boolean;
  /** Whether the user can't read every OTel index, so the values may be missing some data. */
  isPartial: boolean;
  sessions: ComparedValue;
  users: ComparedValue;
  /** `null` values until a crash is defined (#64) and session start reaches the SDKs. */
  crashFreeSessions: ComparedValue;
  /** Exceptions per session. */
  errorRate: ComparedValue;
  /** Releases in the time range and OS, whatever the release filter, most sessions first. */
  releases: string[];
  /** The resource `os.name` values in the time range, whatever the OS and release filters. */
  osNames: string[];
  /** The platforms in the time range, whatever the OS and release filters, sorted. */
  platforms: MobilePlatform[];
  /** Environments in the time range, whatever the environment filter. */
  environments: string[];
  /** The ES|QL of the panels with every filter, for Discover. */
  esql: string;
}
