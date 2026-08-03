/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreEntity } from '@kbn/security-mitre-attack-common';
import type { MitreAttackDataService } from '../../../lib/mitre_attack';
import { buildMitreAttackTool, MITRE_ATTACK_TOOL_ID } from './mitre_attack_tool';

const sampleHit: MitreEntity = {
  type: 'technique',
  framework: 'enterprise',
  versions: ['ATT&CK-v18.1'],
  id: 'T1078',
  name: 'Valid Accounts',
  reference: 'https://attack.mitre.org/techniques/T1078/',
  description: 'desc',
  tactics: ['credential-access'],
};

describe('buildMitreAttackTool', () => {
  const buildDeps = () => {
    const mockSearch = jest.fn().mockResolvedValue([sampleHit]);
    const createClient = jest.fn().mockReturnValue({
      search: mockSearch,
      list: jest.fn(),
      getById: jest.fn(),
    });
    const mitreAttackDataService = {
      createClient,
    } as unknown as MitreAttackDataService;
    const getSpaceId = jest.fn().mockReturnValue('default');
    return { mitreAttackDataService, getSpaceId, createClient, mockSearch };
  };

  it('exposes a stable id', () => {
    const { mitreAttackDataService, getSpaceId } = buildDeps();
    const tool = buildMitreAttackTool({ mitreAttackDataService, getSpaceId });
    expect(tool.id).toBe(MITRE_ATTACK_TOOL_ID);
  });

  it('isSupported returns true when a request is present', () => {
    const { mitreAttackDataService, getSpaceId } = buildDeps();
    const tool = buildMitreAttackTool({ mitreAttackDataService, getSpaceId });
    expect(tool.isSupported({ request: {} } as never)).toBe(true);
    expect(tool.isSupported({ request: undefined } as never)).toBe(false);
  });

  it('getTool returns null when not supported', async () => {
    const { mitreAttackDataService, getSpaceId } = buildDeps();
    const tool = buildMitreAttackTool({ mitreAttackDataService, getSpaceId });
    const result = await tool.getTool({ request: undefined } as never);
    expect(result).toBeNull();
  });

  it('builds a scoped client and searches via the service', async () => {
    const { mitreAttackDataService, getSpaceId, createClient, mockSearch } = buildDeps();
    const tool = buildMitreAttackTool({ mitreAttackDataService, getSpaceId });

    const fakeRequest = { headers: {} } as never;
    const fakeEsClient = { search: jest.fn() } as never;
    const langChainTool = await tool.getTool({
      request: fakeRequest,
      esClient: fakeEsClient,
    } as never);

    expect(getSpaceId).toHaveBeenCalledWith(fakeRequest);
    expect(createClient).toHaveBeenCalledWith({
      spaceId: 'default',
      esClient: fakeEsClient,
    });

    const output = await langChainTool!.invoke({ question: 'credential access' });
    expect(mockSearch).toHaveBeenCalledWith({
      query: 'credential access',
      framework: 'enterprise',
      types: undefined,
      limit: 10,
    });

    const parsed = JSON.parse(output as string);
    expect(parsed.entities[0]).toMatchObject({
      id: 'T1078',
      type: 'technique',
      tactics: ['credential-access'],
    });
  });
});
