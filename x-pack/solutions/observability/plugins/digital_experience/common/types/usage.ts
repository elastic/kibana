/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FrustrationCounts } from '../frustration';

/** A page and the page loads of it. */
export interface TopPage {
  /** The route the app reports for the page, like `/products/{slug}`, or its URL without one. */
  url: string;
  pageLoads: number;
  /** 75th percentile of the load time in milliseconds, `null` without a timed page load. */
  loadTimeP75Ms: number | null;
  /**
   * 75th percentile of the page's web vitals (LCP and INP in milliseconds), and its JS errors.
   * `null` when they are not known: a page without a route (they carry no URL to join on), or one
   * outside the pages with the most of them.
   */
  lcpP75Ms: number | null;
  inpP75Ms: number | null;
  clsP75: number | null;
  jsErrors: number | null;
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

/** The frustration signals on one element (`browser.css_selector`). */
export interface FrustratedElement extends FrustrationCounts {
  cssSelector: string;
  tagName: string | null;
  /** Distinct sessions with a signal on the element. */
  sessions: number;
  /** The path of the full URL with the most signals on the element; URLs differing only by query aren't combined. */
  topPage: string | null;
}

/** The frustration signals on one page path. */
export interface FrustratedPage extends FrustrationCounts {
  page: string;
  /** At least this many sessions: the maximum over the URLs of the path, not their union. */
  sessions: number;
}

/**
 * What users load and do in one application over the time range and environment: its top pages,
 * browsers, operating systems and devices, top clicked elements and frustration signals; every
 * list holds up to `TOP_ROWS` rows.
 */
export interface ApplicationUsage {
  /** By page loads, descending; the URLs of navigation timings only. */
  topPages: TopPage[];
  breakdowns: Breakdowns;
  /** By count, descending. */
  topClicks: TopClick[];
  /** Every click, the denominator of each row's share. */
  totalClicks: number;
  frustration: FrustrationCounts & { sessions: number };
  /** By total, descending. */
  frustratedElements: FrustratedElement[];
  /** By total, descending. */
  frustratedPages: FrustratedPage[];
}

/** The usage of one application, with its environments. */
export interface ApplicationUsageResponse extends ApplicationUsage {
  serviceName: string;
  /** The environments with browser data, whatever the `environment` filter, for the picker. */
  environments: string[];
}
