/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isElasticsearchSolutionActive } from './scope';
import type { IngestGateScopeDeps } from './scope';

type Spaces = NonNullable<IngestGateScopeDeps['spaces']>;
type SolutionView = Awaited<ReturnType<Spaces['getActiveSpace']>>['solution'];

const spacesWith = (solution: SolutionView, isSolutionViewEnabled = true): Spaces => ({
  isSolutionViewEnabled,
  getActiveSpace: () => Promise.resolve({ solution }),
});

const serverless = (projectType: 'search' | 'observability' | 'security' | 'vectordb') => ({
  isServerlessEnabled: true,
  serverless: { projectType },
});

describe('isElasticsearchSolutionActive', () => {
  it('is active in a space with the Elasticsearch solution view', async () => {
    await expect(isElasticsearchSolutionActive({ spaces: spacesWith('es') })).resolves.toBe(true);
  });

  it.each(['oblt', 'security', 'classic', undefined] as const)(
    'is not active in a space with the %s solution view',
    async (solution) => {
      await expect(isElasticsearchSolutionActive({ spaces: spacesWith(solution) })).resolves.toBe(
        false
      );
    }
  );

  it('is not active when solution views are turned off', async () => {
    await expect(isElasticsearchSolutionActive({ spaces: spacesWith('es', false) })).resolves.toBe(
      false
    );
  });

  it('is not active without the spaces plugin', async () => {
    await expect(isElasticsearchSolutionActive({})).resolves.toBe(false);
  });

  it('is active in a serverless search project, whatever the space says', async () => {
    await expect(
      isElasticsearchSolutionActive({ cloud: serverless('search'), spaces: spacesWith(undefined) })
    ).resolves.toBe(true);
  });

  it.each(['observability', 'security', 'vectordb'] as const)(
    'is not active in a serverless %s project',
    async (projectType) => {
      await expect(
        isElasticsearchSolutionActive({ cloud: serverless(projectType), spaces: spacesWith('es') })
      ).resolves.toBe(false);
    }
  );

  it('rejects when the active space cannot be read', async () => {
    await expect(
      isElasticsearchSolutionActive({
        spaces: {
          isSolutionViewEnabled: true,
          getActiveSpace: () => Promise.reject(new Error('forbidden')),
        },
      })
    ).rejects.toThrow('forbidden');
  });
});
