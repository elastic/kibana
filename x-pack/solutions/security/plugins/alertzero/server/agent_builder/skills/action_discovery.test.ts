/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedSkillRegistration } from '@kbn/agent-builder-server/allow_lists';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';
import { ALERTZERO_ACTIONS_LIST_TOOL_ID } from '@kbn/alertzero-common';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { createActionDiscoverySkill } from './action_discovery';

describe('AlertZero action discovery skill', () => {
  it('is a valid built-in skill exposing the action catalog tool', async () => {
    const skill = createActionDiscoverySkill(jest.fn().mockResolvedValue(undefined));
    expect(isAllowedSkillRegistration(skill)).toBe(true);
    await expect(validateSkillDefinition(skill)).resolves.toBeDefined();
    expect(await skill.getRegistryTools?.()).toEqual([ALERTZERO_ACTIONS_LIST_TOOL_ID]);
  });

  it('checks AlertZero read access for each request without caching across spaces or users', async () => {
    const allowedRequest = httpServerMock.createKibanaRequest();
    const deniedRequest = httpServerMock.createKibanaRequest();
    const assertAccess = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('AlertZero is disabled in this space.'));
    const skill = createActionDiscoverySkill(assertAccess);
    const handler = skill.availability?.handler;
    if (!handler) {
      throw new Error('expected an availability handler');
    }
    const uiSettings = {} as Parameters<typeof handler>[0]['uiSettings'];

    expect(skill.availability?.cacheMode).toBe('none');
    await expect(
      handler({ request: allowedRequest, spaceId: 'default', uiSettings })
    ).resolves.toEqual({ status: 'available' });
    await expect(
      handler({ request: deniedRequest, spaceId: 'other', uiSettings })
    ).resolves.toEqual({
      status: 'unavailable',
      reason: 'Requires AlertZero to be enabled in this space and permission to read it.',
    });
    expect(assertAccess).toHaveBeenNthCalledWith(1, allowedRequest, 'read');
    expect(assertAccess).toHaveBeenNthCalledWith(2, deniedRequest, 'read');
  });
});
