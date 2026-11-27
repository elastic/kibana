/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { indexPatternRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import {
  SourceConfigurationRT,
  SourceStatusRuntimeType,
} from '../source_configuration/source_configuration';
import type { DeepPartial } from '../utility_types';

/**
 * Properties specific to the Metrics Source Configuration.
 */
export const metricsSourceConfigurationPropertiesRT = rt.strict({
  name: SourceConfigurationRT.props.name,
  description: SourceConfigurationRT.props.description,
  metricAlias: SourceConfigurationRT.props.metricAlias,
  inventoryDefaultView: SourceConfigurationRT.props.inventoryDefaultView,
  metricsExplorerDefaultView: SourceConfigurationRT.props.metricsExplorerDefaultView,
  anomalyThreshold: rt.number,
});

export type MetricsSourceConfigurationProperties = rt.TypeOf<
  typeof metricsSourceConfigurationPropertiesRT
>;

export const partialMetricsSourceConfigurationReqPayloadRT = rt.partial({
  ...metricsSourceConfigurationPropertiesRT.type.props,
  metricAlias: indexPatternRt,
});

export const partialMetricsSourceConfigurationPropertiesRT = rt.partial({
  ...metricsSourceConfigurationPropertiesRT.type.props,
});

export type PartialMetricsSourceConfigurationProperties = rt.TypeOf<
  typeof partialMetricsSourceConfigurationPropertiesRT
>;

const metricsSourceConfigurationOriginRT = rt.keyof({
  fallback: null,
  internal: null,
  stored: null,
});

/**
 * Outcome of the metric index probe: `unknown` means the check could not be completed
 * (for example it timed out), which is different from a confirmed `missing` index pattern.
 */
export const metricIndicesStatusRT = rt.keyof({
  available: null,
  missing: null,
  unknown: null,
});

export type MetricIndicesStatus = rt.TypeOf<typeof metricIndicesStatusRT>;

export const metricsSourceStatusRT = rt.exact(
  rt.intersection([
    rt.type({
      metricIndicesExist: SourceStatusRuntimeType.props.metricIndicesExist,
      remoteClustersExist: SourceStatusRuntimeType.props.metricIndicesExist,
    }),
    rt.partial({
      metricIndicesStatus: metricIndicesStatusRT,
    }),
  ])
);

export type MetricsSourceStatus = rt.TypeOf<typeof metricsSourceStatusRT>;

export const metricsSourceConfigurationRT = rt.exact(
  rt.intersection([
    rt.type({
      id: rt.string,
      origin: metricsSourceConfigurationOriginRT,
      configuration: metricsSourceConfigurationPropertiesRT,
    }),
    rt.partial({
      updatedAt: rt.number,
      version: rt.string,
      status: metricsSourceStatusRT,
    }),
  ])
);

export type MetricsSourceConfiguration = rt.TypeOf<typeof metricsSourceConfigurationRT>;
export type PartialMetricsSourceConfiguration = DeepPartial<MetricsSourceConfiguration>;

export const metricsSourceConfigurationResponseRT = rt.type({
  source: metricsSourceConfigurationRT,
});

export type MetricsSourceConfigurationResponse = rt.TypeOf<
  typeof metricsSourceConfigurationResponseRT
>;
