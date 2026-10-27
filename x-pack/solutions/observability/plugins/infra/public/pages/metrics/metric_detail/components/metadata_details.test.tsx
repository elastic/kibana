/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { InfraMetadata } from '../../../../../common/http_api';
import { MetadataContext } from '../containers/metadata_context';
import { MetadataDetails } from './metadata_details';

const renderDetails = (info: InfraMetadata['info']) => {
  const metadata: InfraMetadata = { id: 'node-1', name: 'node-1', features: [], info };

  return render(
    <EuiProvider highContrastMode={false}>
      <MetadataContext.Provider value={metadata}>
        <MetadataDetails />
      </MetadataContext.Provider>
    </EuiProvider>
  );
};

const valueFor = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

describe('MetadataDetails', () => {
  it('reads the ECS fields when they are present', () => {
    renderDetails({
      cloud: { provider: 'gcp', instance: { id: 'instance-1' } },
      host: { os: { name: 'Ubuntu', kernel: '5.15.0' } },
    });

    expect(valueFor('Instance ID')).toBe('instance-1');
    expect(valueFor('Cloud Provider')).toBe('gcp');
    expect(valueFor('Operating System')).toBe('Ubuntu');
    expect(valueFor('Kernel Version')).toBe('5.15.0');
  });

  it('falls back to the OpenTelemetry equivalents', () => {
    renderDetails({
      cloud: { provider: 'aws', resource_id: 'arn:aws:ec2:instance/i-1' },
      host: { os: { platform: 'linux' } },
    });

    expect(valueFor('Instance ID')).toBe('arn:aws:ec2:instance/i-1');
    expect(valueFor('Operating System')).toBe('linux');
  });

  it('falls back to resource.attributes when no ECS-aliased value is present', () => {
    renderDetails({
      resource: {
        attributes: {
          cloud: { provider: 'azure', resource_id: 'vm-1' },
          os: { name: 'Debian GNU/Linux' },
        },
      },
    });

    expect(valueFor('Instance ID')).toBe('vm-1');
    expect(valueFor('Cloud Provider')).toBe('azure');
    expect(valueFor('Operating System')).toBe('Debian GNU/Linux');
  });

  it('shows -- for fields with no OpenTelemetry equivalent', () => {
    renderDetails({
      host: { name: 'otel-host', os: { platform: 'linux', version: '6.12.76-linuxkit' } },
    });

    expect(valueFor('Kernel Version')).toBe('--');
  });

  it('renders nothing without metadata', () => {
    const { container } = render(
      <EuiProvider highContrastMode={false}>
        <MetadataContext.Provider value={null}>
          <MetadataDetails />
        </MetadataContext.Provider>
      </EuiProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
