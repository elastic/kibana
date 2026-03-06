/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SeverityCount } from '../../../../../entity_analytics/components/severity/types';

export interface AttacksListBucket {
  /** The attack ID */
  key: string;
  /** The alerts count */
  doc_count: number;
  /** The attack related alerts */
  attackRelatedAlerts?: {
    /** The attack related alerts count */
    doc_count: number;
  };
  /** The alerts severities */
  alertsSeverities?: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

export interface AttacksListAgg {
  /** The attacks */
  attacks: {
    /** The attacks buckets */
    buckets: AttacksListBucket[];
  };
  /** The total attacks */
  total_attacks: {
    /** The total attacks count */
    value: number;
  };
}

export interface AttacksListItem {
  /** The attack ID */
  id: string;
  /** The attack name */
  name: string;
  /** The alerts count */
  alertsCount: number;
  /** The severity count */
  severityCount: SeverityCount;
}
