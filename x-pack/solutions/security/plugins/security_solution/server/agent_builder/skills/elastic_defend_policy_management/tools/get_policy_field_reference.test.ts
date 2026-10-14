/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { z } from '@kbn/zod/v4';
import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz/mocks';
import { createMockEndpointAppContextService } from '../../../../endpoint/mocks';
import { createToolHandlerContext } from '../../../__mocks__/test_helpers';
import {
  GET_POLICY_FIELD_REFERENCE_TOOL_ID,
  createGetPolicyFieldReferenceTool,
  getPolicyFieldReferenceSchema,
} from './get_policy_field_reference';

const createContext = (): ToolHandlerContext =>
  createToolHandlerContext(
    httpServerMock.createKibanaRequest(),
    elasticsearchClientMock.createScopedClusterClient(),
    loggingSystemMock.createLogger(),
    { spaceId: 'space-marketing' }
  );
const createTool = () => {
  const endpointAppContextService = createMockEndpointAppContextService();
  endpointAppContextService.getEndpointAuthz.mockResolvedValue(
    getEndpointAuthzInitialStateMock({
      canReadPolicyManagement: true,
      canReadEndpointList: false,
      canWritePolicyManagement: false,
    })
  );
  return createGetPolicyFieldReferenceTool({ endpointAppContextService });
};
const search = async (keywords: string[], os?: 'windows' | 'mac' | 'linux') => {
  const selector = os === undefined ? { keywords } : { keywords, os };
  const result = await createTool().handler({ selector }, createContext());
  if (!('results' in result)) throw new Error('expected result');
  const item = result.results[0];
  if (item.type !== ToolResultType.other || !('data' in item))
    throw new Error('expected result data');
  return item.data as {
    results: Array<Record<string, unknown>>;
    keywords: string[];
    os?: string;
    results_total: number;
    results_truncated: boolean;
  };
};
const lookupPath = async (path: string) => {
  const result = await createTool().handler({ selector: { path } }, createContext());
  if (!('results' in result)) throw new Error('expected result');
  const item = result.results[0];
  if (item.type !== ToolResultType.other || !('data' in item))
    throw new Error('expected result data');
  return item.data as Record<string, unknown>;
};
const pathLookupCases: Array<{
  name: string;
  path: string;
  expected: Record<string, unknown>;
  entryPaths?: string[];
}> = [
  {
    name: 'resolves an exact writable path with its accepted values',
    path: 'windows.malware.mode',
    expected: {
      found: true,
      match: 'exact',
      path: 'windows.malware.mode',
      writable: true,
      acceptedValues: { type: 'enum', values: ['detect', 'prevent', 'off'] },
    },
  },
  {
    name: 'reports an unknown path as a miss',
    path: 'windows.unknown.setting',
    expected: {
      found: false,
      match: 'none',
      path: 'windows.unknown.setting',
      reason: 'unknown_path',
    },
  },
  {
    name: 'keeps a wrong-OS exact path an unknown_path miss',
    path: 'windows.events.session_data',
    expected: {
      found: false,
      match: 'none',
      path: 'windows.events.session_data',
      reason: 'unknown_path',
    },
  },
  {
    name: 'expands an OS-less remainder across operating systems',
    path: 'behavior_protection.reputation_service',
    expected: {
      found: true,
      match: 'os_less_remainder',
      path: 'behavior_protection.reputation_service',
    },
    entryPaths: [
      'linux.behavior_protection.reputation_service',
      'mac.behavior_protection.reputation_service',
      'windows.behavior_protection.reputation_service',
    ],
  },
  {
    name: 'returns the four accepted values for usb_storage',
    path: 'windows.device_control.usb_storage',
    expected: {
      found: true,
      match: 'exact',
      path: 'windows.device_control.usb_storage',
      writable: true,
      acceptedValues: {
        type: 'enum',
        values: ['audit', 'read_only', 'no_execute', 'deny_all'],
      },
    },
  },
];
describe('createGetPolicyFieldReferenceTool', () => {
  it('defines the approved builtin tool', () => {
    const tool = createTool();
    expect(tool.id).toBe(GET_POLICY_FIELD_REFERENCE_TOOL_ID);
  });
  it('matches all keywords and returns accepted values', async () => {
    const result = await search(['device', 'control']);
    expect(result.keywords).toEqual(['device', 'control']);
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results.every((hit) => 'path' in hit)).toBe(true);
  });
  it('supports labels, OS filters, and truncation', async () => {
    const label = await search(['api']);
    expect(label.results.some((hit) => hit.path === 'windows.events.credential_access')).toBe(true);
    const filtered = await search(['dns'], 'windows');
    expect(filtered.os).toBe('windows');
    expect(filtered.results.every((hit) => String(hit.path).startsWith('windows.'))).toBe(true);
    const broad = await search(['event']);
    expect(broad.results).toHaveLength(10);
    expect(broad.results_truncated).toBe(true);
  });
  it.each(pathLookupCases)('looks up a path: $name', async ({ path, expected, entryPaths }) => {
    const result = await lookupPath(path);
    expect(result).toMatchObject(expected);
    if (entryPaths !== undefined) {
      expect(
        (result.entries as Array<{ entry: { path: string } }>).map((entry) => entry.entry.path)
      ).toEqual(expect.arrayContaining(entryPaths));
    }
  });
  it('returns accepted values on a matching search result', async () => {
    const result = await search(['usb_storage']);
    const hit = result.results.find((entry) => entry.path === 'windows.device_control.usb_storage');
    expect(hit).toBeDefined();
    expect(hit).toMatchObject({
      writable: true,
      acceptedValues: {
        type: 'enum',
        values: ['audit', 'read_only', 'no_execute', 'deny_all'],
      },
    });
  });
  it('emits strict keyword selector schema', () => {
    const schema = z.toJSONSchema(getPolicyFieldReferenceSchema, { io: 'input' });
    expect(schema.required).toEqual(['selector']);
    expect(JSON.stringify(schema)).toContain('keywords');
    expect(JSON.stringify(schema)).not.toContain('query');
  });
});
