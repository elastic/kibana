/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsImporter } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { installEntityStoreDashboards } from './install_dashboards';

const makeImporter = (
  override?: Partial<ReturnType<ISavedObjectsImporter['import']> extends Promise<infer R> ? R : never>
): jest.Mocked<ISavedObjectsImporter> => {
  const defaultResult = {
    success: true,
    successCount: 2,
    warnings: [],
    errors: [],
    successResults: [],
    ...override,
  };
  return {
    import: jest.fn().mockResolvedValue(defaultResult),
    resolveImportErrors: jest.fn(),
  } as unknown as jest.Mocked<ISavedObjectsImporter>;
};

describe('installEntityStoreDashboards', () => {
  const logger = loggerMock.create();
  const spaceId = 'default';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls importer.import with the correct options', async () => {
    const importer = makeImporter();
    await installEntityStoreDashboards({ importer, logger, spaceId });

    expect(importer.import).toHaveBeenCalledTimes(1);
    const [call] = importer.import.mock.calls;
    const [opts] = call;

    expect(opts.managed).toBe(true);
    expect(opts.overwrite).toBe(true);
    expect(opts.createNewCopies).toBe(false);
    expect(opts.refresh).toBe(false);
    // default space maps to undefined namespace
    expect(opts.namespace).toBeUndefined();
  });

  it('passes namespace for non-default space', async () => {
    const importer = makeImporter();
    await installEntityStoreDashboards({ importer, logger, spaceId: 'my-space' });

    const [{ namespace }] = importer.import.mock.calls[0];
    expect(namespace).toBe('my-space');
  });

  it('streams exactly 2 saved objects (index-pattern + dashboard, no summary line)', async () => {
    const importer = makeImporter();
    await installEntityStoreDashboards({ importer, logger, spaceId });

    const [{ readStream }] = importer.import.mock.calls[0];
    const chunks: object[] = [];
    for await (const chunk of readStream) {
      chunks.push(chunk);
    }
    expect(chunks).toHaveLength(2);
    const types = chunks.map((c) => (c as Record<string, unknown>).type);
    expect(types).toContain('index-pattern');
    expect(types).toContain('dashboard');
  });

  it('throws and retries when importResult.success is false', async () => {
    const importer = makeImporter({
      success: false,
      errors: [{ type: 'dashboard', id: 'test-id', error: { type: 'unknown' } } as never],
    });

    await expect(
      installEntityStoreDashboards({ importer, logger, spaceId })
    ).rejects.toThrow();

    // pRetry with 2 retries → 3 total attempts
    expect(importer.import).toHaveBeenCalledTimes(3);
  });

  it('logs warnings returned by the importer', async () => {
    const importer = makeImporter({
      warnings: [{ type: 'deprecated', message: 'something deprecated' } as never],
    });
    await installEntityStoreDashboards({ importer, logger, spaceId });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('something deprecated')
    );
  });
});
