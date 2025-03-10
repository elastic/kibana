/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: https://github.com/elastic/kibana/issues/110905

import { offeringBasedSchema, schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { DEFAULT_ANNOTATION_INDEX } from '../common/annotations';
import type { ObservabilityPluginSetup } from './plugin';
import { createOrUpdateIndex, Mappings } from './utils/create_or_update_index';
import { createOrUpdateIndexTemplate } from './utils/create_or_update_index_template';
import { ScopedAnnotationsClient } from './lib/annotations/bootstrap_annotations';
import { CustomThresholdLocators } from './lib/rules/custom_threshold/custom_threshold_executor';
import {
  unwrapEsResponse,
  WrappedElasticsearchClientError,
} from '../common/utils/unwrap_es_response';

export {
  rangeQuery,
  kqlQuery,
  termQuery,
  termsQuery,
  wildcardQuery,
  existsQuery,
} from './utils/queries';
export { getParsedFilterQuery } from './utils/get_parsed_filtered_query';
export { getInspectResponse } from '../common/utils/get_inspect_response';

export type {
  ObservabilityRouteCreateOptions,
  ObservabilityRouteHandlerResources,
  AbstractObservabilityServerRouteRepository,
  ObservabilityServerRouteRepository,
  APIEndpoint,
  ObservabilityAPIReturnType,
  ObservabilityRequestHandlerContext,
  ObservabilityPluginRouter,
} from './types';
export {
  metricsExplorerViewSavedObjectAttributesRT,
  metricsExplorerViewSavedObjectRT,
} from './types';

const configSchema = schema.object({
  annotations: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    index: schema.string({ defaultValue: DEFAULT_ANNOTATION_INDEX }),
  }),
  unsafe: schema.object({
    alertDetails: schema.object({
      metrics: schema.object({
        enabled: schema.boolean({ defaultValue: false }),
      }),
      logs: schema.object({
        enabled: schema.boolean({ defaultValue: false }),
      }),
      uptime: schema.object({
        enabled: schema.boolean({ defaultValue: false }),
      }),
      observability: schema.object({
        enabled: schema.boolean({ defaultValue: false }),
      }),
    }),
    thresholdRule: schema.object({
      enabled: offeringBasedSchema({
        serverless: schema.boolean({ defaultValue: false }),
        traditional: schema.boolean({ defaultValue: false }),
      }),
    }),
    ruleFormV2: schema.object({
      enabled: schema.boolean({ defaultValue: false }),
    }),
  }),
  customThresholdRule: schema.object({
    groupByPageSize: schema.number({ defaultValue: 10_000 }),
  }),
  enabled: schema.boolean({ defaultValue: true }),
  createO11yGenericFeatureId: schema.boolean({ defaultValue: false }),
});

export const config: PluginConfigDescriptor = {
  exposeToBrowser: {
    unsafe: true,
    aiAssistant: {
      enabled: true,
      feedback: {
        enabled: true,
      },
    },
  },
  schema: configSchema,
  deprecations: ({ unused }) => [
    unused('unsafe.thresholdRule.enabled', { level: 'warning' }),
    unused('unsafe.alertDetails.logs.enabled', { level: 'warning' }),
    unused('unsafe.alertDetails.metrics.enabled', { level: 'warning' }),
    unused('unsafe.alertDetails.observability.enabled', { level: 'warning' }),
  ],
};

export type ObservabilityConfig = TypeOf<typeof configSchema>;

export const plugin = async (initContext: PluginInitializerContext) => {
  const { ObservabilityPlugin } = await import('./plugin');
  return new ObservabilityPlugin(initContext);
};

export type {
  Mappings,
  ObservabilityPluginSetup,
  ScopedAnnotationsClient,
  CustomThresholdLocators,
};
export {
  createOrUpdateIndex,
  createOrUpdateIndexTemplate,
  unwrapEsResponse,
  WrappedElasticsearchClientError,
};

export { uiSettings } from './ui_settings';
