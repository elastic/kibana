/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Inventory view object returned by the Kibana API
 */
export interface InventoryView {
  id: string;
  attributes: InventoryViewAttributes;
  updatedAt?: string;
  version?: string;
}

interface InventoryViewAttributes {
  name: string;
  accountId: string;
  autoBounds: boolean;
  boundsOverride: {
    min: number;
    max: number;
  };
  customMetrics: Record<string, any>[];
  customOptions: InventoryViewCustomOptions[];
  groupBy: Record<string, any>[];
  metric: { type: InventoryViewMetricType } & Record<string, any>;
  nodeType: InventoryViewItemType;
  region: string;
  sort: InventoryViewSort;
  view: InventoryViewViewType;
  autoReload: boolean;
  filterQuery: InventoryViewFilter;
  legend?: InventoryViewLegend;
  source?: string;
  timelineOpen?: boolean;
  preferredSchema?: InventoryViewPreferredSchema | null;
  isDefault?: boolean;
  isStatic?: boolean;
  time?: number;
}

interface InventoryViewSort {
  by: InventoryViewSortBy;
  direction: InventoryViewSortDirection;
}
type InventoryViewSortBy = 'name' | 'value';
type InventoryViewSortDirection = 'asc' | 'desc';

type InventoryViewViewType = 'table' | 'map';

interface InventoryViewLegend {
  palette: InventoryViewLegendPalette;
  steps: number;
  reverseColors: boolean;
}
type InventoryViewLegendPalette =
  | 'status'
  | 'temperature'
  | 'cool'
  | 'warm'
  | 'positive'
  | 'negative';

type InventoryViewPreferredSchema = 'ecs' | 'semconv';

interface InventoryViewCustomOptions {
  text: string;
  field: string;
}

interface InventoryViewFilter {
  kind: 'kuery';
  expression: string;
}

type InventoryViewMetricType =
  | 'count'
  | 'cpuV2'
  | 'cpu'
  | 'diskLatency'
  | 'diskSpaceUsage'
  | 'load'
  | 'memory'
  | 'memoryFree'
  | 'memoryTotal'
  | 'normalizedLoad1m'
  | 'tx'
  | 'rx'
  | 'txV2'
  | 'rxV2'
  | 'logRate'
  | 'diskIOReadBytes'
  | 'diskIOWriteBytes'
  | 's3TotalRequests'
  | 's3NumberOfObjects'
  | 's3BucketSize'
  | 's3DownloadBytes'
  | 's3UploadBytes'
  | 'rdsConnections'
  | 'rdsQueriesExecuted'
  | 'rdsActiveTransactions'
  | 'rdsLatency'
  | 'sqsMessagesVisible'
  | 'sqsMessagesDelayed'
  | 'sqsMessagesSent'
  | 'sqsMessagesEmpty'
  | 'sqsOldestMessage'
  | 'custom';

type InventoryViewItemType =
  | 'host'
  | 'pod'
  | 'container'
  | 'awsEC2'
  | 'awsS3'
  | 'awsSQS'
  | 'host'
  | 'pod'
  | 'container'
  | 'awsEC2'
  | 'awsS3'
  | 'awsSQS'
  | 'awsRDS';

/**
 * Inventory view in a reduced form as returned by the findAll API
 */
export interface SingleInventoryView {
  id: string;
  attributes: {
    name: string;
    isDefault?: boolean;
    isStatic?: boolean;
  };
  updatedAt?: string;
  version?: string;
}

/**
 * Response with an array of reduced inventory views
 */
export interface FindInventoryViewResponse {
  data: SingleInventoryView[];
}

/**
 * Response with a single, expanded inventory view
 */
export interface InventoryViewResponse {
  data: InventoryView;
}

/**
 * Attributes payload for creating a new inventory view
 */
export interface CreateInventoryViewAttributes
  extends Omit<InventoryViewAttributes, 'isDefault' | 'isStatic'> {
  isDefault?: undefined;
  isStatic?: undefined;
}
