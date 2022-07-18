/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Cluster stats URL. Replace this with any from kibana core if there is ever a constant there for this.
 */
export const getStatsUrl = (): string => '/api/telemetry/v2/clusters/_stats';
