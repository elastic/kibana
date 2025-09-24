/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import { createToolingLogger } from '../../../../common/endpoint/data_loaders/utils';
import { createDetectionEngineCrowdStrikeRuleIfNeeded } from './create_detection_engine_rule';
import * as detectionRulesServices from '../../common/detection_rules_services';

jest.mock('../../common/detection_rules_services');

const mockedDetectionRulesServices = detectionRulesServices as jest.Mocked<
  typeof detectionRulesServices
>;

describe('createDetectionEngineCrowdStrikeRuleIfNeeded', () => {
  let mockKbnClient: jest.Mocked<KbnClient>;
  let mockLog: ReturnType<typeof createToolingLogger>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockKbnClient = {
      request: jest.fn(),
    } as unknown as jest.Mocked<KbnClient>;

    mockLog = createToolingLogger();
  });

  it('should skip creation if rule already exists', async () => {
    const existingRule = {
      name: 'Promote CrowdStrike alerts',
      id: 'existing-rule-id',
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    mockedDetectionRulesServices.findRules.mockResolvedValue({
      page: 1,
      perPage: 10,
      total: 1,
      data: [existingRule],
    });

    const result = await createDetectionEngineCrowdStrikeRuleIfNeeded(mockKbnClient, mockLog);

    expect(result).toBe(existingRule);
    expect(mockedDetectionRulesServices.findRules).toHaveBeenCalledWith(mockKbnClient, {
      filter: 'alert.attributes.tags:("dev-script-run-crowdstrike-host")',
    });
    expect(mockedDetectionRulesServices.createRule).not.toHaveBeenCalled();
  });

  it('should create new rule if none exists', async () => {
    mockedDetectionRulesServices.findRules.mockResolvedValue({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });

    const newRule = {
      name: 'Promote CrowdStrike alerts',
      id: 'new-rule-id',
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    mockedDetectionRulesServices.createRule.mockResolvedValue(newRule);

    const result = await createDetectionEngineCrowdStrikeRuleIfNeeded(mockKbnClient, mockLog);

    expect(result).toBe(newRule);
    expect(mockedDetectionRulesServices.createRule).toHaveBeenCalledWith(mockKbnClient, {
      index: ['*crowdstrike.alert*'],
      query: 'device.id: *',
      from: 'now-360s',
      meta: {
        from: '90m',
      },
      name: 'Promote CrowdStrike alerts',
      description: expect.stringContaining('Created by dev script'),
      tags: ['dev-script-run-crowdstrike-host'],
    });
  });

  it('should include namespace in index patterns when provided', async () => {
    mockedDetectionRulesServices.findRules.mockResolvedValue({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });

    const newRule = {
      name: 'Promote CrowdStrike alerts',
      id: 'new-rule-id',
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    mockedDetectionRulesServices.createRule.mockResolvedValue(newRule);

    await createDetectionEngineCrowdStrikeRuleIfNeeded(mockKbnClient, mockLog, 'test-namespace');

    expect(mockedDetectionRulesServices.createRule).toHaveBeenCalledWith(mockKbnClient, {
      index: ['*crowdstrike.alert-test-namespace*'],
      query: 'device.id: *',
      from: 'now-360s',
      meta: {
        from: '90m',
      },
      name: 'Promote CrowdStrike alerts',
      description: expect.stringContaining('Created by dev script'),
      tags: ['dev-script-run-crowdstrike-host'],
    });
  });
});
