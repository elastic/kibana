/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTasksKibanaBridge } from '@kbn/core-plugins-server';

/**
 * Set by the plugin's `server` entry once it has registered its steps, triggers and agent builder
 * contributions. Where Kibana also boots the tasks entry, that entry has nothing left to register.
 */
export const nightshiftInvestigationsBridge = createTasksKibanaBridge<true>();
