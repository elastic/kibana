/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Checks cluster privileges required to use Inference API / Elastic Managed LLM connectors. */
export const INFERENCE_CONNECTOR_PRIVILEGES_INTERNAL_URL =
  '/internal/inference_connector/privileges' as const;

/**
 * Cluster privilege required to call Elasticsearch Inference APIs (e.g. Elastic Managed LLM /
 * `.inference` connectors).
 */
export const INFERENCE_CONNECTOR_CLUSTER_PRIVILEGE = 'monitor_inference' as const;
