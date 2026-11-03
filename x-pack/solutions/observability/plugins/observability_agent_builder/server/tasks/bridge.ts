/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTasksKibanaBridge } from '@kbn/core-plugins-server';

/**
 * Set by the plugin's `server` entry once it has registered what Observability Agent Builder
 * contributes to Agent Builder, so a tasks entry that boots in the same process (Kibana) does not
 * register it a second time. A task pod has no `server` entry and registers it itself.
 */
export const observabilityAgentBuilderBridge = createTasksKibanaBridge<true, true>();
