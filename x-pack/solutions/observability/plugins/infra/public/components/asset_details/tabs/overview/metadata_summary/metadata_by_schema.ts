/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import type { InfraMetadata } from '../../../../../../common/http_api';
import type { MetadataData } from './metadata_summary_list';

const ecsHostExtendedMetadata = (metadataInfo: InfraMetadata['info']): MetadataData[] => [
  {
    field: 'cloudProvider',
    value: metadataInfo?.cloud?.provider,
    tooltipFieldLabel: 'cloud.provider',
    tooltipLink: 'https://www.elastic.co/guide/en/ecs/current/ecs-cloud.html#field-cloud-provider',
  },
  {
    field: 'operatingSystem',
    value: metadataInfo?.host?.os?.name,
    tooltipFieldLabel: 'host.os.name',
  },
];

const ecsHostMetadataData = (metadataInfo: InfraMetadata['info']): MetadataData[] => [
  {
    field: 'hostIp',
    value: metadataInfo?.host?.ip,
    tooltipFieldLabel: 'host.ip',
    tooltipLink: 'https://www.elastic.co/guide/en/ecs/current/ecs-host.html#field-host-ip',
  },
  {
    field: 'hostOsVersion',
    value: metadataInfo?.host?.os?.version,
    tooltipFieldLabel: 'host.os.version',
  },
];

const ecsContainerExtendedMetadata = (metadataInfo: InfraMetadata['info']): MetadataData[] => [
  {
    field: 'runtime',
    value: metadataInfo?.container?.runtime,
    tooltipFieldLabel: 'container.runtime',
  },
  {
    field: 'cloudInstanceId',
    value: metadataInfo?.cloud?.instance?.id,
    tooltipFieldLabel: 'cloud.instance.id',
  },
  {
    field: 'cloudImageId',
    value: metadataInfo?.cloud?.imageId,
    tooltipFieldLabel: 'cloud.image.id',
  },
  {
    field: 'cloudProvider',
    value: metadataInfo?.cloud?.provider,
    tooltipFieldLabel: 'cloud.provider',
  },
];

const ecsContainerMetadataData = (metadataInfo: InfraMetadata['info']): MetadataData[] => [
  {
    field: 'containerId',
    value: metadataInfo?.container?.id,
    tooltipFieldLabel: 'container.id',
  },
  {
    field: 'containerImageName',
    value: metadataInfo?.container?.image?.name,
    tooltipFieldLabel: 'container.image.name',
  },
  {
    field: 'hostName',
    value: metadataInfo?.host?.name,
    tooltipFieldLabel: 'host.name',
  },
];

const semConvHostExtendedMetadata = (metadataInfo: InfraMetadata['info']): MetadataData[] => [
  {
    field: 'cloudProvider',
    value: metadataInfo?.resource?.attributes?.cloud?.provider,
    tooltipFieldLabel: 'cloud.provider',
    tooltipLink:
      'https://opentelemetry.io/docs/specs/semconv/registry/attributes/cloud/#cloud-provider',
  },
  {
    field: 'operatingSystem',
    value: metadataInfo?.resource?.attributes?.os?.name,
    tooltipFieldLabel: 'os.name',
    tooltipLink: 'https://opentelemetry.io/docs/specs/semconv/registry/attributes/os/#os-name',
  },
];

const semConvHostMetadataData = (metadataInfo: InfraMetadata['info']): MetadataData[] => [
  {
    field: 'hostIp',
    value: metadataInfo?.resource?.attributes?.host?.ip,
    tooltipFieldLabel: 'host.ip',
    tooltipLink: 'https://opentelemetry.io/docs/specs/semconv/registry/attributes/host/#host-ip',
  },
  {
    field: 'hostOsVersion',
    value: metadataInfo?.resource?.attributes?.os?.version,
    tooltipFieldLabel: 'os.version',
    tooltipLink: 'https://opentelemetry.io/docs/specs/semconv/registry/attributes/os/#os-version',
  },
];

const semConvContainerExtendedMetadata = (metadataInfo: InfraMetadata['info']): MetadataData[] => [
  {
    field: 'runtime',
    value: metadataInfo?.resource?.attributes?.container?.runtime,
    tooltipFieldLabel: 'container.runtime',
    tooltipLink:
      'https://opentelemetry.io/docs/specs/semconv/registry/attributes/container/#container-runtime',
  },
  {
    field: 'cloudInstanceId',
    value: metadataInfo?.resource?.attributes?.cloud?.resource?.id,
    tooltipFieldLabel: 'cloud.resource.id',
    tooltipLink:
      'https://opentelemetry.io/docs/specs/semconv/registry/attributes/cloud/#cloud-resource-id',
  },
  // is this deprecated??
  {
    field: 'cloudImageId',
    value: metadataInfo?.resource?.attributes?.cloud?.imageId,
    tooltipFieldLabel: 'cloud.image.id',
  },
  {
    field: 'cloudProvider',
    value: metadataInfo?.resource?.attributes?.cloud?.provider,
    tooltipFieldLabel: 'cloud.provider',
    tooltipLink:
      'https://opentelemetry.io/docs/specs/semconv/registry/attributes/cloud/#cloud-provider',
  },
];

const semConvContainerMetadataData = (metadataInfo: InfraMetadata['info']): MetadataData[] => [
  {
    field: 'containerId',
    value: metadataInfo?.resource?.attributes?.container?.id,
    tooltipFieldLabel: 'container.id',
    tooltipLink:
      'https://opentelemetry.io/docs/specs/semconv/registry/attributes/container/#container-id',
  },
  {
    field: 'containerImageName',
    value: metadataInfo?.resource?.attributes?.container?.image?.name,
    tooltipFieldLabel: 'container.image.name',
    tooltipLink:
      'https://opentelemetry.io/docs/specs/semconv/registry/attributes/container/#container-image-name',
  },
  {
    field: 'hostName',
    value: metadataInfo?.resource?.attributes?.host?.name,
    tooltipFieldLabel: 'host.name',
    tooltipLink: 'https://opentelemetry.io/docs/specs/semconv/registry/attributes/host/#host-name',
  },
];

export const getMetadataBySchema = (
  metadata: InfraMetadata['info'],
  schema: DataSchemaFormat | null
) => {
  switch (schema) {
    case 'ecs':
      return {
        host: {
          metadata: ecsHostMetadataData(metadata),
          extended: ecsHostExtendedMetadata(metadata),
        },
        container: {
          metadata: ecsContainerMetadataData(metadata),
          extended: ecsContainerExtendedMetadata(metadata),
        },
      };
    case 'semconv':
      return {
        host: {
          metadata: semConvHostMetadataData(metadata),
          extended: semConvHostExtendedMetadata(metadata),
        },
        container: {
          metadata: semConvContainerMetadataData(metadata),
          extended: semConvContainerExtendedMetadata(metadata),
        },
      };
    default:
      return {
        host: {
          metadata: [],
          extended: [],
        },
        container: {
          metadata: [],
          extended: [],
        },
      };
  }
};
