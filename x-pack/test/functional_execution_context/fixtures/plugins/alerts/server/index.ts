/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './ensure_apm_started';
import type { PluginInitializerContext } from 'kibana/server';
import { FixturePlugin } from './plugin';

export const plugin = (ctx: PluginInitializerContext) => new FixturePlugin(ctx);
