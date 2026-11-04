/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The `runtime_types` barrel is imported by hundreds of files that only need enums,
 * constants and types. Zod schemas live in `./schemas/*` and must be imported from
 * there directly, so that importing the barrel never builds (or retains) a schema.
 */
describe('runtime_types barrel', () => {
  it('does not load zod (and therefore no schema) when imported', () => {
    jest.isolateModules(() => {
      jest.doMock('@kbn/zod', () => {
        throw new Error(
          'The runtime_types barrel pulled in @kbn/zod. Import schemas from runtime_types/schemas/* instead.'
        );
      });

      const barrel = jest.requireActual('.');

      expect(barrel.ConfigKey).toBeDefined();
      expect(barrel.MonitorTypeEnum).toBeDefined();
    });
  });
});
