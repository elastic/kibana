/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A page and the page loads of it. */
export interface TopPage {
  url: string;
  pageLoads: number;
  /** 75th percentile of the load time in milliseconds, `null` without a timed page load. */
  loadTimeP75Ms: number | null;
}

/** A browser, operating system or device and the page loads from it. */
export interface BreakdownItem {
  name: string;
  pageLoads: number;
}

/** The page loads by browser, operating system and device. */
export interface Breakdowns {
  /** Every page load, the denominator of each row's share. */
  pageLoads: number;
  /** By page loads, descending. */
  browsers: BreakdownItem[];
  /** By page loads, descending. */
  operatingSystems: BreakdownItem[];
  /** By page loads, descending. */
  devices: BreakdownItem[];
}

/** The clicks on one element. */
export interface TopClick {
  cssSelector: string;
  tagName: string | null;
  count: number;
}

/**
 * What users load and do in one application over the time range and environment: its top pages,
 * browsers, operating systems and devices, and top clicked elements; every list holds up to
 * `TOP_ROWS` rows.
 */
export interface ApplicationUsageResponse {
  /** By page loads, descending; the URLs of navigation timings only. */
  topPages: TopPage[];
  breakdowns: Breakdowns;
  /** By count, descending. */
  topClicks: TopClick[];
  /** Every click, the denominator of each row's share. */
  totalClicks: number;
}
