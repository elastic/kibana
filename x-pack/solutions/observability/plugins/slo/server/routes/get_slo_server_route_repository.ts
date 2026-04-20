/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSloRouteRepository } from './slo/route';

interface RouteRepositoryOptions {
  isServerless?: boolean;
  isCompositeSloEnabled?: boolean;
}

export function getSloServerRouteRepository({
  isServerless,
  isCompositeSloEnabled,
}: RouteRepositoryOptions = {}) {
  return getSloRouteRepository({ isServerless, isCompositeSloEnabled });
}

export type SLORouteRepository = ReturnType<typeof getSloServerRouteRepository>;
