/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { InfraPluginRequestHandlerContext } from '../types';
import type { InfraSources } from './sources';

export class InfraSourceStatus {
  constructor(
    private readonly adapter: InfraSourceStatusAdapter,
    private readonly libs: { sources: InfraSources }
  ) {}

  public async getMetricIndexNames(
    requestContext: InfraPluginRequestHandlerContext,
    sourceId: string
  ): Promise<string[]> {
    const soClient = (await requestContext.core).savedObjects.client;
    const sourceConfiguration = await this.libs.sources.getSourceConfiguration(soClient, sourceId);
    const indexNames = await this.adapter.getIndexNames(
      requestContext,
      sourceConfiguration.configuration.metricAlias
    );
    return indexNames;
  }

  public async hasMetricAlias(
    requestContext: InfraPluginRequestHandlerContext,
    sourceId: string
  ): Promise<boolean> {
    const soClient = (await requestContext.core).savedObjects.client;
    const sourceConfiguration = await this.libs.sources.getSourceConfiguration(soClient, sourceId);
    const hasAlias = await this.adapter.hasAlias(
      requestContext,
      sourceConfiguration.configuration.metricAlias
    );
    return hasAlias;
  }

  public async hasMetricIndices(
    requestContext: InfraPluginRequestHandlerContext,
    metricAlias: string,
    request?: KibanaRequest
  ): Promise<boolean> {
    return this.adapter.hasIndices(requestContext, metricAlias, request);
  }
}

export interface InfraSourceStatusAdapter {
  getIndexNames(
    requestContext: InfraPluginRequestHandlerContext,
    aliasName: string
  ): Promise<string[]>;

  hasAlias(requestContext: InfraPluginRequestHandlerContext, aliasName: string): Promise<boolean>;

  hasIndices(
    requestContext: InfraPluginRequestHandlerContext,
    indexNames: string,
    request?: KibanaRequest
  ): Promise<boolean>;
}
