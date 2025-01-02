/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import Boom from '@hapi/boom';
import { get } from 'lodash';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { throwErrors } from '@kbn/io-ts-utils';
import {
  InfraMetadataFeature,
  InfraMetadataRequestRT,
  InfraMetadataRT,
} from '../../../common/http_api/metadata_api';
import { InfraBackendLibs } from '../../lib/infra_types';
import { getMetricMetadata } from './lib/get_metric_metadata';
import { pickFeatureName } from './lib/pick_feature_name';
import { getCloudMetricsMetadata } from './lib/get_cloud_metric_metadata';
import { getNodeInfo } from './lib/get_node_info';
import { getInfraMetricsClient } from '../../lib/helpers/get_infra_metrics_client';

const escapeHatch = schema.object({}, { unknowns: 'allow' });

export const initMetadataRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/infra/metadata',
      validate: {
        body: escapeHatch,
      },
    },
    async (requestContext, request, response) => {
      const { nodeId, nodeType, sourceId, timeRange } = pipe(
        InfraMetadataRequestRT.decode(request.body),
        fold(throwErrors(Boom.badRequest), identity)
      );

      const soClient = (await requestContext.core).savedObjects.client;
      const { configuration } = await libs.sources.getSourceConfiguration(soClient, sourceId);
      const infraMetricsClient = await getInfraMetricsClient({
        request,
        libs,
        context: requestContext,
      });
      const metricsMetadata = await getMetricMetadata(
        framework,
        requestContext,
        configuration,
        nodeId,
        nodeType,
        timeRange,
        infraMetricsClient
      );
      const metricFeatures = pickFeatureName(metricsMetadata.buckets).map(nameToFeature('metrics'));

      const info = await getNodeInfo(
        framework,
        requestContext,
        configuration,
        nodeId,
        nodeType,
        timeRange
      );
      const cloudInstanceId = get(info, 'cloud.instance.id');

      const cloudMetricsMetadata = cloudInstanceId
        ? await getCloudMetricsMetadata(
            framework,
            requestContext,
            configuration,
            cloudInstanceId,
            timeRange
          )
        : { buckets: [] };
      const cloudMetricsFeatures = pickFeatureName(cloudMetricsMetadata.buckets).map(
        nameToFeature('metrics')
      );
      const id = metricsMetadata.id;
      const name = metricsMetadata.name || id;

      const responseBody = InfraMetadataRT.encode({
        id,
        name,
        features: [...metricFeatures, ...cloudMetricsFeatures],
        info: {
          ...info,
          timestamp: info['@timestamp'],
        },
      });
      if (nodeType === 'host') {
        const hasSystemIntegration = metricsMetadata?.hasSystemIntegration;
        return response.ok({ body: { ...responseBody, hasSystemIntegration } });
      }

      return response.ok({ body: responseBody });
    }
  );
};

const nameToFeature =
  (source: string) =>
  (name: string): InfraMetadataFeature => ({
    name,
    source,
  });
