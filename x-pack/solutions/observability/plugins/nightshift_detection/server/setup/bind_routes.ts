/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { Route } from '@kbn/core-di-server';
import { EnableServiceAccountRoute } from '../routes/service_account/enable_service_account_route';
import { GetServiceAccountStatusRoute } from '../routes/service_account/get_service_account_status_route';

/** Registers the engine's HTTP routes. A route is one `bind(Route).toConstantValue(...)` line. */
export function bindRoutes({ bind }: ContainerModuleLoadOptions): void {
  bind(Route).toConstantValue(EnableServiceAccountRoute);
  bind(Route).toConstantValue(GetServiceAccountStatusRoute);
}
