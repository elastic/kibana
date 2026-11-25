/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The requests of one method and URL. */
export interface HttpRequestGroup {
  method: string;
  url: string;
  count: number;
  /** 95th percentile of the duration in milliseconds, `null` without a timed request. */
  p95Ms: number | null;
  failedCount: number;
  /** `null` without a request with a known outcome. */
  failedRatio: number | null;
}

/** The loads of one resource URL. */
export interface SlowResource {
  url: string;
  initiatorType: string | null;
  /** Whether any load of the resource was render-blocking. */
  renderBlocking: boolean;
  count: number;
  /** 75th percentile of the duration in milliseconds, `null` without a timed load. */
  p75Ms: number | null;
  /** 75th percentile of the transfer size in bytes, `null` without a size. */
  transferSizeP75Bytes: number | null;
}

/** The Network tab of one EDOT Browser application over the time range and environment. */
export interface ApplicationNetworkResponse {
  serviceName: string;
  /** Client spans by method and URL, by count, descending; up to `TOP_ROWS`. */
  httpRequests: HttpRequestGroup[];
  /** Scripts, styles, images and fonts, by p75 duration, descending (approximate); up to 50. */
  slowestResources: SlowResource[];
  /** The environments with browser data, whatever the `environment` filter, for the picker. */
  environments: string[];
}
