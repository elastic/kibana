/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import { createToolingLogger } from '../../../../common/endpoint/data_loaders/utils';
import { onboardVmHostWithCrowdStrike } from './install_crowdstrike_agent';
import type { HostVm } from '../../common/types';
import * as vmServices from '../../common/vm_services';
import * as spaces from '../../common/spaces';

jest.mock('../../common/vm_services');
jest.mock('../../common/spaces');

const mockedVmServices = vmServices as jest.Mocked<typeof vmServices>;
const mockedSpaces = spaces as jest.Mocked<typeof spaces>;

describe('onboardVmHostWithCrowdStrike', () => {
  let mockKbnClient: jest.Mocked<KbnClient>;
  let mockLog: ReturnType<typeof createToolingLogger>;
  let mockHostVm: HostVm;

  beforeEach(() => {
    jest.clearAllMocks();

    mockKbnClient = {
      request: jest.fn(),
    } as unknown as jest.Mocked<KbnClient>;

    mockLog = createToolingLogger();

    mockHostVm = {
      type: 'multipass',
      name: 'test-vm',
      upload: jest.fn().mockResolvedValue({ filePath: '/uploaded/path' }),
      exec: jest.fn().mockResolvedValue({ stdout: 'success' }),
      info: jest.fn().mockReturnValue('VM info'),
    } as unknown as HostVm;
    mockedSpaces.fetchActiveSpace.mockResolvedValue({
      id: 'default',
      name: 'Default',
      disabledFeatures: [],
    });
    mockedVmServices.generateVmName.mockReturnValue('test-crowdstrike-vm');
    mockedVmServices.findVm.mockResolvedValue({ data: [] });
    mockedVmServices.createVm.mockResolvedValue(mockHostVm);
  });

  it('should create and configure CrowdStrike VM when no existing VM found', async () => {
    const options = {
      kbnClient: mockKbnClient,
      log: mockLog,
      sensorInstaller: '/path/to/sensor.deb',
      customerId: 'test-customer-id',
    };

    const result = await onboardVmHostWithCrowdStrike(options);

    expect(result).toBe(mockHostVm);
    expect(mockedVmServices.createVm).toHaveBeenCalledWith({
      type: 'multipass',
      name: 'test-crowdstrike-vm',
      log: mockLog,
      memory: '4G',
      image: 'release:22.04',
    });
    expect(mockHostVm.upload).toHaveBeenCalledWith(
      '/path/to/sensor.deb',
      '/home/ubuntu/crowdstrike-falcon-sensor.deb'
    );
  });

  it('should reuse existing VM when forceNewCrowdStrikeHost is false', async () => {
    const existingVm = 'existing-vm';
    mockedVmServices.findVm.mockResolvedValue({ data: [existingVm] });
    mockedVmServices.createMultipassHostVmClient.mockReturnValue(mockHostVm);

    const options = {
      kbnClient: mockKbnClient,
      log: mockLog,
      sensorInstaller: '/path/to/sensor.deb',
      customerId: 'test-customer-id',
      forceNewCrowdStrikeHost: false,
    };

    const result = await onboardVmHostWithCrowdStrike(options);

    expect(result).toBe(mockHostVm);
    expect(mockedVmServices.createVm).not.toHaveBeenCalled();
    expect(mockedVmServices.createMultipassHostVmClient).toHaveBeenCalledWith(existingVm, mockLog);
  });

  it('should create new VM even when existing VM found if forceNewCrowdStrikeHost is true', async () => {
    const existingVm = 'existing-vm';
    mockedVmServices.findVm.mockResolvedValue({ data: [existingVm] });

    const options = {
      kbnClient: mockKbnClient,
      log: mockLog,
      sensorInstaller: '/path/to/sensor.deb',
      customerId: 'test-customer-id',
      forceNewCrowdStrikeHost: true,
    };

    const result = await onboardVmHostWithCrowdStrike(options);

    expect(result).toBe(mockHostVm);
    expect(mockedVmServices.createVm).toHaveBeenCalled();
    expect(mockedVmServices.createMultipassHostVmClient).not.toHaveBeenCalled();
  });
});
