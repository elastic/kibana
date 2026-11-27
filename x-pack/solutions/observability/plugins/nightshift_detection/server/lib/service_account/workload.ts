/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * What the detection engine does outside a workflow run runs as the service account bound to this
 * workload in the space. The engine registers its own type: Core keys workload types and bindings
 * by plugin, so it does not clash with a registration in another plugin.
 */
export const DETECTION_ENGINE_WORKLOAD_TYPE = 'detection_engine';

/** One binding per space: the binding carries the space. */
export const DETECTION_ENGINE_WORKLOAD_ID = 'detection_engine';
