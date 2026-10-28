/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { Space } from '@kbn/spaces-plugin/common';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { isSpaceSupported$ } from './is_space_supported';

const createSpaces = (space: Partial<Space> | Error) => {
  const spaces = spacesPluginMock.createStartContract();
  if (space instanceof Error) {
    spaces.getActiveSpace.mockRejectedValue(space);
  } else {
    spaces.getActiveSpace.mockResolvedValue({
      id: DEFAULT_SPACE_ID,
      name: 'Default',
      disabledFeatures: [],
      ...space,
    });
  }
  return spaces;
};

describe('isSpaceSupported$', () => {
  it('supports a space with the security solution', async () => {
    const spaces = createSpaces({ solution: 'security' });

    await expect(firstValueFrom(isSpaceSupported$({ isServerless: false, spaces }))).resolves.toBe(
      true
    );
  });

  it.each([[{ solution: 'oblt' as const }], [{ solution: 'es' as const }]])(
    'does not support a space with another solution (%j)',
    async (space) => {
      const spaces = createSpaces(space);

      await expect(
        firstValueFrom(isSpaceSupported$({ isServerless: false, spaces }))
      ).resolves.toBe(false);
    }
  );

  it.each([[{ solution: 'classic' as const }], [{}]])(
    'does not support a Classic space (%j)',
    async (space) => {
      const spaces = createSpaces(space);

      await expect(
        firstValueFrom(isSpaceSupported$({ isServerless: false, spaces }))
      ).resolves.toBe(false);
    }
  );

  it('does not support any space when the spaces plugin is missing', async () => {
    await expect(
      firstValueFrom(isSpaceSupported$({ isServerless: false, spaces: undefined }))
    ).resolves.toBe(false);
  });

  it('does not support a space that cannot be read', async () => {
    const spaces = createSpaces(new Error('space not found'));

    await expect(firstValueFrom(isSpaceSupported$({ isServerless: false, spaces }))).resolves.toBe(
      false
    );
  });

  it('skips the check on serverless', async () => {
    const spaces = createSpaces({ solution: 'classic' });

    await expect(firstValueFrom(isSpaceSupported$({ isServerless: true, spaces }))).resolves.toBe(
      true
    );
    expect(spaces.getActiveSpace).not.toHaveBeenCalled();
  });
});
