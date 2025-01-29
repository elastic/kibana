/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityRuleTypeModel } from '@kbn/observability-plugin/public';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import type { ClientPluginsStart } from '../../../../plugin';

export type AlertTypeInitializer<TAlertTypeModel = ObservabilityRuleTypeModel> = (dependencies: {
  core: CoreStart;
  plugins: ClientPluginsStart;
}) => TAlertTypeModel;
