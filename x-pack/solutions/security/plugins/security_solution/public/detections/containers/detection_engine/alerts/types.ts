/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Status } from '../../../../../common/api/detection_engine';

export interface BasicSignals {
  signal: AbortSignal;
}
export interface QueryAlerts extends BasicSignals {
  query: object;
}

export interface AlertsResponse {
  took: number;
  timeout: boolean;
}

export interface AlertSearchResponse<Hit = {}, Aggregations = {} | undefined>
  extends AlertsResponse {
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  aggregations?: Aggregations;
  hits: {
    total: {
      value: number;
      relation: string;
    };
    max_score?: number | null;
    hits: Hit[];
  };
}

export interface UpdateAlertStatusByQueryProps {
  query: object;
  status: Status;
  signal?: AbortSignal;
}

export interface UpdateAlertStatusByIdsProps {
  signalIds: string[];
  status: Status;
  signal?: AbortSignal;
}

export interface AlertsIndex {
  name: string;
  index_mapping_outdated: boolean;
}

export interface CheckSignalIndex {
  name: string;
  index_mapping_outdated: boolean;
  indexExists: boolean;
}

export type CasesFromAlertsResponse = Array<{ id: string; title: string }>;

export interface Privilege {
  username: string;
  has_all_requested: boolean;
  cluster: {
    monitor_ml: boolean;
    manage_index_templates: boolean;
    monitor_transform: boolean;
    manage_api_key: boolean;
    manage_security: boolean;
    manage_own_api_key: boolean;
    all: boolean;
    monitor: boolean;
    manage: boolean;
    manage_transform: boolean;
    manage_ml: boolean;
    manage_pipeline: boolean;
  };
  index: {
    [indexName: string]: {
      all: boolean;
      maintenance: boolean;
      read: boolean;
      create_index: boolean;
      index: boolean;
      monitor: boolean;
      delete: boolean;
      manage: boolean;
      delete_index: boolean;
      create_doc: boolean;
      view_index_metadata: boolean;
      create: boolean;
      write: boolean;
    };
  };
  application: {};
  is_authenticated: boolean;
  has_encryption_key: boolean;
}
