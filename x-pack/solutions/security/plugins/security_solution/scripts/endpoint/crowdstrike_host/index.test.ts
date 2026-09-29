/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { cli } from '.';
import { run } from '@kbn/dev-cli-runner';

vi.mock('@kbn/dev-cli-runner');
vi.mock('./services/create_detection_engine_rule');
vi.mock('./services/install_crowdstrike_agent');
vi.mock('./services/create_crowdstrike_connector');
vi.mock('../common/vm_services');
vi.mock('../common/stack_services');
vi.mock('../common/spaces');

const mockedRun = run as MockedFunction<typeof run>;

describe('CrowdStrike Host CLI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should setup CLI with correct configuration', async () => {
    mockedRun.mockImplementation(() => Promise.resolve());

    await cli();

    expect(mockedRun).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        description: expect.stringContaining('CrowdStrike Falcon hosts data'),
        flags: expect.objectContaining({
          string: expect.arrayContaining([
            'clientId',
            'clientSecret',
            'customerId',
            'apiUrl',
            'sensorInstaller',
            'kibanaUrl',
            'username',
            'password',
            'vmName',
            'spaceId',
            'apiKey',
            'policy',
            'version',
          ]),
          boolean: ['forceFleetServer', 'forceNewCrowdStrikeHost', 'forceNewAgentlessHost'],
          default: expect.objectContaining({
            apiUrl: 'https://api.us-2.crowdstrike.com',
            kibanaUrl: 'http://127.0.0.1:5601',
            username: 'elastic',
            password: 'changeme',
            apiKey: '',
            policy: '',
            spaceId: '',
          }),
          help: expect.stringContaining('--sensorInstaller'),
        }),
      })
    );
  });

  it('should include help text for required parameters', async () => {
    mockedRun.mockImplementation(() => Promise.resolve());

    await cli();

    const runCall = mockedRun.mock.calls[0];
    const config = runCall?.[1];

    expect(config?.flags?.help).toContain('--sensorInstaller');
    expect(config?.flags?.help).toContain('--clientId');
    expect(config?.flags?.help).toContain('--clientSecret');
    expect(config?.flags?.help).toContain('--apiUrl');
  });
});
