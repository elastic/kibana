/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CatalogWriter,
  ClassificationWorkflowClient,
  QueryValidator,
  RepositoryResolver,
  SourceReader,
} from './domain';
import { extractRepository } from './extract_repository';

describe('extractRepository', () => {
  it('completes successfully without workflows or writes when standard discovery finds nothing', async () => {
    const repositoryResolver: RepositoryResolver = {
      resolve: async (request) => ({
        status: 'success',
        value: {
          commitSha: 'a'.repeat(40),
          repository: request.repository,
          requestedRevision: request.revision,
        },
      }),
    };
    const reader: SourceReader = {
      grep: async () => ({ items: [], status: 'complete' }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => {
        throw new Error('No source windows should be read.');
      },
    };
    const workflows: ClassificationWorkflowClient = {
      classifyLogging: async () => {
        throw new Error('No logging workflow should run.');
      },
      classifyOtel: async () => {
        throw new Error('No OTel workflow should run.');
      },
    };
    const catalogWriter: CatalogWriter = { write: jest.fn() };
    const validator: QueryValidator = {
      validate: async () => ({ diagnostics: [], status: 'skipped' }),
    };

    const result = await extractRepository({
      catalogWriter,
      extractorVersion: 'test',
      now: () => '2026-09-28T00:00:00.000Z',
      reader,
      repositoryRequest: { repository: 'elastic/example', revision: 'main' },
      repositoryResolver,
      validator,
      workflows,
    });

    expect(result).toMatchObject({
      status: 'success',
      value: {
        generatedTemplates: [],
        write: { failures: [], writtenIds: [] },
      },
    });
    expect(catalogWriter.write).not.toHaveBeenCalled();
  });
});
