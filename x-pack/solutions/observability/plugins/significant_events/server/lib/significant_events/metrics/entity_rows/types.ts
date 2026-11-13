/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Shares row and drop types used to find metrics type KIs.
import type { FeatureUpsert } from '@kbn/significant-events-schema';

export type EsqlScalar = string | number | boolean | null;
export type EsqlCell = EsqlScalar | readonly EsqlScalar[];
export type EsqlRow = Readonly<Record<string, EsqlCell>>;

// The cap is 500; one extra row detects overflow.
export const ENTITY_QUERY_LIMIT = 501;

export interface DroppedMetricsEntityRows {
  nullNodeName: number;
  nullCluster: number;
  idTooLong: number;
}

export interface EntityFoldResult {
  features: FeatureUpsert[];
  droppedIncompleteRowsCount: number;
  droppedRows: DroppedMetricsEntityRows;
  unknownClusterRows: number;
}

export interface EntityFoldContext {
  sourceQuery: string;
  sourceId: string;
}

export interface EntityKeyRow {
  id: string;
  families: readonly string[];
  datasets: readonly string[];
  datasetPrefixes?: readonly string[];
  subtype:
    | 'k8s.deployment'
    | 'k8s.statefulset'
    | 'k8s.daemonset'
    | 'k8s.cronjob'
    | 'k8s.node'
    | 'k8s.namespace'
    | 'host'
    | 'service';
  buildQuery: (sourceQuery: string) => string;
  foldRows: (rows: EsqlRow[], context: EntityFoldContext) => EntityFoldResult;
}

export const createDroppedRows = (): DroppedMetricsEntityRows => ({
  nullNodeName: 0,
  nullCluster: 0,
  idTooLong: 0,
});

export const droppedRowsCount = (droppedRows: DroppedMetricsEntityRows): number =>
  droppedRows.nullNodeName + droppedRows.nullCluster + droppedRows.idTooLong;
