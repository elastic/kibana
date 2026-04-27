/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { registerIngestFlows } from './register_ingest_flows';
import type { ObservabilityOnboardingPluginStartDeps } from '../plugin';

describe('registerIngestFlows', () => {
  it('does nothing when the ingestHub plugin is unavailable', () => {
    const core = coreMock.createStart();
    const plugins = {} as unknown as ObservabilityOnboardingPluginStartDeps;

    expect(() => registerIngestFlows(core, plugins)).not.toThrow();
  });

  it('registers the expected flow ids', () => {
    const core = coreMock.createStart();
    const registerIngestFlowsSpy = jest.fn();
    const plugins = {
      ingestHub: { registerIngestFlows: registerIngestFlowsSpy },
    } as unknown as ObservabilityOnboardingPluginStartDeps;

    registerIngestFlows(core, plugins);

    expect(registerIngestFlowsSpy).toHaveBeenCalledTimes(1);
    const flows = registerIngestFlowsSpy.mock.calls[0][0];
    expect(flows.map((f: { id: string }) => f.id)).toEqual([
      'host_linux',
      'host_mac',
      'host_windows',
      'kubernetes',
      'docker',
      'amazon_ecs',
      'aws',
      'gcp',
      'azure',
    ]);
  });
});
