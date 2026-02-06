/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cli } from '.';
import { run } from '@kbn/dev-cli-runner';

jest.mock('@kbn/dev-cli-runner');
jest.mock('./services/create_detection_engine_rule');
jest.mock('./services/install_crowdstrike_agent');
jest.mock('./services/create_crowdstrike_connector');
jest.mock('../common/vm_services');
jest.mock('../common/stack_services');
jest.mock('../common/spaces');

const mockedRun = run as jest.MockedFunction<typeof run>;

describe('CrowdStrike Host CLI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
