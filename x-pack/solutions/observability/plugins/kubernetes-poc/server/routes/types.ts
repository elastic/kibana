/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreRequestHandlerContext,
  CoreSetup,
  CoreStart,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
} from '@kbn/core/server';

export interface KubernetesPocRequestHandlerContext {
  core: Promise<CoreRequestHandlerContext>;
}

export interface KubernetesPocRouteHandlerResources {
  context: KubernetesPocRequestHandlerContext;
  logger: Logger;
  request: KibanaRequest;
  response: KibanaResponseFactory;
  core: {
    setup: CoreSetup;
    start: () => Promise<CoreStart>;
  };
}

export interface KubernetesPocRouteCreateOptions {
  xsrfRequired?: boolean;
}
