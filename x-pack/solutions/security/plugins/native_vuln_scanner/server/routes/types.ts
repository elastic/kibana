/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  ISavedObjectsRepository,
  Logger,
  IRouter,
  RequestHandlerContext,
} from '@kbn/core/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import type { GetLicense } from './with_license';

/** What the routes need from the start contracts, resolved lazily on the first request. */
export interface RouteServices {
  /** Absent when Fleet is disabled; routes answer 503. */
  fleet?: FleetStartContract;
  workflows: WorkflowsManagementApi;
  /**
   * Internal user, for the run summary index and the aggregate-only osquery results read; never
   * used for Fleet writes.
   */
  es: ElasticsearchClient;
  packRepository: ISavedObjectsRepository;
}

export interface RouteDependencies {
  router: IRouter<RequestHandlerContext>;
  logger: Logger;
  getLicense: GetLicense;
  getServices: () => Promise<RouteServices>;
}
