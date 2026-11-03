/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MatchKey } from './types';

const groupingKey = (...entityColumns: string[]): MatchKey =>
  entityColumns.map((entityColumn) => ({
    entityColumn,
    alertField: `kibana.alert.grouping.${entityColumn}`,
  }));

/**
 * The alert fields that identify each entity type. A type may have several keys, for the several
 * ways rules group, and an alert is counted once however many keys it satisfies.
 *
 * A key matches an alert whose grouping carries those fields, whatever else it groups by, so an
 * alert grouped by namespace and pod name also satisfies the namespace key: namespace and cluster
 * counts include the alerts of what they contain.
 */
export const ALERT_MATCH_KEYS: Readonly<Record<string, readonly MatchKey[]>> = {
  'k8s.node': [groupingKey('k8s.node.name')],
  'k8s.deployment': [groupingKey('k8s.namespace.name', 'k8s.deployment.name')],
  'k8s.daemonset': [groupingKey('k8s.namespace.name', 'k8s.daemonset.name')],
  'k8s.statefulset': [groupingKey('k8s.namespace.name', 'k8s.statefulset.name')],
  'k8s.pod': [groupingKey('k8s.pod.uid'), groupingKey('k8s.pod.name', 'k8s.namespace.name')],
  'k8s.namespace': [groupingKey('k8s.namespace.name')],
  'k8s.cluster': [groupingKey('k8s.cluster.name')],
};

export const getMatchKeys = (type: string): readonly MatchKey[] => ALERT_MATCH_KEYS[type] ?? [];
