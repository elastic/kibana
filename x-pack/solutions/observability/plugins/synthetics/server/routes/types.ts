/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subject } from 'rxjs';
import type { ObjectType } from '@kbn/config-schema';
import type {
  RequestHandler,
  RouteConfig,
  RouteMethod,
  SavedObjectsClientContract,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
  RouteSecurity,
} from '@kbn/core/server';
import type {
  VersionedRouteValidation,
  HttpResponsePayload,
  ResponseError,
} from '@kbn/core-http-server';
import type { MonitorConfigRepository } from '../services/monitor_config_repository';
import type { SyntheticsEsClient } from '../lib';
import type { SyntheticsServerSetup, UptimeRequestHandlerContext } from '../types';
import type { SyntheticsMonitorClient } from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
export type SyntheticsRequest = KibanaRequest<
  Record<string, any>,
  Record<string, any>,
  Record<string, any>
>;

export type SupportedMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Defines the basic properties employed by Uptime routes.
 */
export interface UMServerRoute<T> {
  method: SupportedMethod;
  writeAccess?: boolean;
  requiredPrivileges?: string[];
  handler: T;
  validation?: VersionedRouteValidation<any, any, any>;
  streamHandler?: (
    context: UptimeRequestHandlerContext,
    request: SyntheticsRequest,
    subject: Subject<unknown>
  ) => IKibanaResponse<any> | Promise<IKibanaResponse<any>>;
}

/**
 * Merges basic uptime route properties with the route config type
 * provided by Kibana core.
 */
export type UMRouteDefinition<T> = UMServerRoute<T> &
  Omit<RouteConfig<ObjectType, ObjectType, ObjectType, RouteMethod>, 'security'> & {
    security?: RouteSecurity;
  };

/**
 * This type represents an Uptime route definition that corresponds to the contract
 * provided by the Kibana platform. Route objects must conform to this type in order
 * to successfully interact with the Kibana platform.
 */
export type UMKibanaRoute = UMRouteDefinition<
  RequestHandler<ObjectType, ObjectType, ObjectType, UptimeRequestHandlerContext>
>;

export type SyntheticsRestApiRouteFactory<
  ClientContract extends HttpResponsePayload | ResponseError = any,
  Params = any,
  Query = Record<string, any>,
  Body = any
> = () => SyntheticsRoute<ClientContract, Params, Query, Body>;

export type SyntheticsRoute<
  ClientContract extends HttpResponsePayload | ResponseError = any,
  Params = Record<string, any>,
  Query = Record<string, any>,
  Body = any
> = UMRouteDefinition<SyntheticsRouteHandler<ClientContract, Params, Query, Body>>;

export type SyntheticsRouteWrapper = (
  uptimeRoute: SyntheticsRoute<Record<string, unknown>>,
  server: SyntheticsServerSetup,
  syntheticsMonitorClient: SyntheticsMonitorClient
) => UMKibanaRoute & { security: RouteSecurity };

export interface RouteContext<
  Params = Record<string, any>,
  Query = Record<string, any>,
  Body = any
> {
  syntheticsEsClient: SyntheticsEsClient;
  context: UptimeRequestHandlerContext;
  request: KibanaRequest<Params, Query, Body>;
  response: KibanaResponseFactory;
  savedObjectsClient: SavedObjectsClientContract;
  server: SyntheticsServerSetup;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  subject?: Subject<unknown>;
  spaceId: string;
  monitorConfigRepository: MonitorConfigRepository;
}

export type SyntheticsRouteHandler<
  ClientContract extends HttpResponsePayload | ResponseError = any,
  Params = Record<string, any>,
  Query = Record<string, any>,
  Body = any
> = ({
  syntheticsEsClient,
  context,
  request,
  response,
  server,
  savedObjectsClient,
  subject,
}: RouteContext<Params, Query, Body>) => Promise<IKibanaResponse<ClientContract> | ClientContract>;
