/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfraMetadata } from '../../../../../../common/http_api';
import type { MetadataData } from './metadata_summary_list';
import { getHostMetadataBySchema } from './metadata_by_schema';

const valueOf = (fields: MetadataData[], field: string) =>
  fields.find((entry) => entry.field === field)?.value;

const tooltipOf = (fields: MetadataData[], field: string) =>
  fields.find((entry) => entry.field === field)?.tooltipFieldLabel;

const ecsInfo: InfraMetadata['info'] = {
  host: {
    ip: '192.168.0.1',
    os: { name: 'Ubuntu', version: '18.04', platform: 'linux' },
  },
  cloud: { provider: 'gcp' },
};

// Shape returned for OpenTelemetry data streams: the resource attributes reach the response under
// their ECS aliases (`os.version` -> `host.os.version`, `os.type` -> `host.os.platform`).
const semconvAliasedInfo: InfraMetadata['info'] = {
  host: {
    name: 'otel-host',
    ip: '10.0.0.1',
    os: { platform: 'linux', version: '6.12.76-linuxkit' },
    architecture: 'arm64',
  },
  cloud: { provider: 'aws' },
};

const semconvResourceInfo: InfraMetadata['info'] = {
  resource: {
    attributes: {
      host: { ip: '10.0.0.2' },
      os: { name: 'Debian GNU/Linux', version: '12', type: 'linux' },
      cloud: { provider: 'azure' },
    },
  },
};

describe('getHostMetadataBySchema', () => {
  it('reads ECS paths for the ecs schema', () => {
    const { metadata, extended } = getHostMetadataBySchema(ecsInfo, 'ecs');

    expect(valueOf(metadata, 'hostIp')).toBe('192.168.0.1');
    expect(valueOf(metadata, 'hostOsVersion')).toBe('18.04');
    expect(valueOf(extended, 'cloudProvider')).toBe('gcp');
    expect(valueOf(extended, 'operatingSystem')).toBe('Ubuntu');
    expect(tooltipOf(metadata, 'hostOsVersion')).toBe('host.os.version');
  });

  it('reads the ECS-aliased paths for the semconv schema', () => {
    const { metadata, extended } = getHostMetadataBySchema(semconvAliasedInfo, 'semconv');

    expect(valueOf(metadata, 'hostIp')).toBe('10.0.0.1');
    expect(valueOf(metadata, 'hostOsVersion')).toBe('6.12.76-linuxkit');
    expect(valueOf(extended, 'cloudProvider')).toBe('aws');
  });

  it('falls back to host.os.platform when os.name is missing', () => {
    const { extended } = getHostMetadataBySchema(semconvAliasedInfo, 'semconv');

    expect(valueOf(extended, 'operatingSystem')).toBe('linux');
  });

  it('keeps the semantic conventions tooltip labels for the semconv schema', () => {
    const { metadata, extended } = getHostMetadataBySchema(semconvAliasedInfo, 'semconv');

    expect(tooltipOf(metadata, 'hostOsVersion')).toBe('os.version');
    expect(tooltipOf(extended, 'operatingSystem')).toBe('os.name');
  });

  it('falls back to resource.attributes when no ECS-aliased value is present', () => {
    const { metadata, extended } = getHostMetadataBySchema(semconvResourceInfo, 'semconv');

    expect(valueOf(metadata, 'hostIp')).toBe('10.0.0.2');
    expect(valueOf(metadata, 'hostOsVersion')).toBe('12');
    expect(valueOf(extended, 'cloudProvider')).toBe('azure');
    expect(valueOf(extended, 'operatingSystem')).toBe('Debian GNU/Linux');
  });

  it('prefers the ECS-aliased value on every field when both shapes are present', () => {
    const { metadata, extended } = getHostMetadataBySchema(
      { ...semconvAliasedInfo, ...semconvResourceInfo },
      'semconv'
    );

    expect(valueOf(metadata, 'hostIp')).toBe('10.0.0.1');
    expect(valueOf(metadata, 'hostOsVersion')).toBe('6.12.76-linuxkit');
    expect(valueOf(extended, 'cloudProvider')).toBe('aws');
    // `operatingSystem` is the one interleaved chain: an exact `os.name` from either shape outranks
    // degrading to `os.type` / `host.os.platform`, so the resource attribute wins here.
    expect(valueOf(extended, 'operatingSystem')).toBe('Debian GNU/Linux');
  });

  it('still resolves ECS values while the schema has not resolved yet', () => {
    // `schema` is null until the time range metadata resolves, which falls through to the semconv
    // field set. The ECS-first chains keep the values correct in the meantime.
    const { metadata, extended } = getHostMetadataBySchema(ecsInfo, null);

    expect(valueOf(metadata, 'hostIp')).toBe('192.168.0.1');
    expect(valueOf(metadata, 'hostOsVersion')).toBe('18.04');
    expect(valueOf(extended, 'operatingSystem')).toBe('Ubuntu');
    expect(valueOf(extended, 'cloudProvider')).toBe('gcp');
  });

  it('returns undefined values when nothing is available', () => {
    const { metadata, extended } = getHostMetadataBySchema({}, 'semconv');

    expect(valueOf(metadata, 'hostIp')).toBeUndefined();
    expect(valueOf(extended, 'operatingSystem')).toBeUndefined();
  });
});
