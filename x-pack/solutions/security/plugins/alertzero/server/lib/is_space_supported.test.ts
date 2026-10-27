/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { Space } from '@kbn/spaces-plugin/common';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import { isSpaceSupported } from './is_space_supported';

const request = httpServerMock.createKibanaRequest();

const createSpaces = (space: Partial<Space> | Error) => {
  const spaces = spacesMock.createStart();
  if (space instanceof Error) {
    spaces.spacesService.getActiveSpace.mockRejectedValue(space);
  } else {
    spaces.spacesService.getActiveSpace.mockResolvedValue({
      id: DEFAULT_SPACE_ID,
      name: 'Default',
      disabledFeatures: [],
      ...space,
    });
  }
  return spaces;
};

describe('isSpaceSupported', () => {
  it.each([['security'], ['oblt'], ['es']] as const)(
    'supports a space with the %s solution',
    async (solution) => {
      await expect(
        isSpaceSupported({ isServerless: false, spaces: createSpaces({ solution }), request })
      ).resolves.toBe(true);
    }
  );

  it.each([[{ solution: 'classic' as const }], [{}]])(
    'does not support a Classic space (%j)',
    async (space) => {
      await expect(
        isSpaceSupported({ isServerless: false, spaces: createSpaces(space), request })
      ).resolves.toBe(false);
    }
  );

  it('does not support any space when the spaces plugin is missing', async () => {
    await expect(
      isSpaceSupported({ isServerless: false, spaces: undefined, request })
    ).resolves.toBe(false);
  });

  it('does not support a space that cannot be read', async () => {
    await expect(
      isSpaceSupported({
        isServerless: false,
        spaces: createSpaces(new Error('space not found')),
        request,
      })
    ).resolves.toBe(false);
  });

  it('skips the check on serverless', async () => {
    const spaces = createSpaces({ solution: 'classic' });

    await expect(isSpaceSupported({ isServerless: true, spaces, request })).resolves.toBe(true);
    expect(spaces.spacesService.getActiveSpace).not.toHaveBeenCalled();
  });
});
