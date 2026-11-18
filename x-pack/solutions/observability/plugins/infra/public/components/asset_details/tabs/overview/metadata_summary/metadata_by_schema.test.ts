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

const ecsInfo: InfraMetadata['info'] = {
  host: {
    ip: '192.168.0.1',
    os: { name: 'Ubuntu', version: '18.04', platform: 'linux' },
  },
  cloud: { provider: 'gcp' },
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
  });

  it('falls back to resource.attributes for an OTel host that resolves to the ecs schema', () => {
    // An OpenTelemetry host can resolve to the `ecs` schema when `preferredSchema` mismatches the
    // document shape. Without the fallback the Overview section renders empty while the Metadata tab
    // (which reads `resource.attributes.*`) stays populated.
    const { metadata, extended } = getHostMetadataBySchema(semconvResourceInfo, 'ecs');

    expect(valueOf(metadata, 'hostIp')).toBe('10.0.0.2');
    expect(valueOf(metadata, 'hostOsVersion')).toBe('12');
    expect(valueOf(extended, 'cloudProvider')).toBe('azure');
    expect(valueOf(extended, 'operatingSystem')).toBe('Debian GNU/Linux');
  });

  it('prefers the ECS value over the resource.attributes fallback when both are present', () => {
    const { metadata, extended } = getHostMetadataBySchema(
      { ...ecsInfo, ...semconvResourceInfo },
      'ecs'
    );

    expect(valueOf(metadata, 'hostIp')).toBe('192.168.0.1');
    expect(valueOf(metadata, 'hostOsVersion')).toBe('18.04');
    expect(valueOf(extended, 'cloudProvider')).toBe('gcp');
    expect(valueOf(extended, 'operatingSystem')).toBe('Ubuntu');
  });
});
