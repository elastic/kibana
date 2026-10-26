/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const METRICS_INVENTORY_PATH = '/inventory';
export const METRICS_HOSTS_PATH = '/hosts';
export const METRICS_EXPLORER_PATH = '/explorer';
export const METRICS_SETTINGS_PATH = '/settings';
export const METRICS_DETAIL_PATH = '/detail';

const matchesPath = (pathname: string, path: string): boolean =>
  pathname === path || pathname.startsWith(`${path}/`);

export const isMetricsInventoryPath = (pathname: string): boolean =>
  matchesPath(pathname, METRICS_INVENTORY_PATH);

export const isMetricsHostsPath = (pathname: string): boolean =>
  matchesPath(pathname, METRICS_HOSTS_PATH);

export const isMetricsExplorerPath = (pathname: string): boolean =>
  matchesPath(pathname, METRICS_EXPLORER_PATH);

export const isMetricsSettingsPath = (pathname: string): boolean =>
  matchesPath(pathname, METRICS_SETTINGS_PATH);

export const isMetricsDetailPath = (pathname: string): boolean =>
  matchesPath(pathname, METRICS_DETAIL_PATH);

export const isMetricsHostDetailPath = (pathname: string): boolean =>
  pathname === `${METRICS_DETAIL_PATH}/host` || pathname.startsWith(`${METRICS_DETAIL_PATH}/host/`);
