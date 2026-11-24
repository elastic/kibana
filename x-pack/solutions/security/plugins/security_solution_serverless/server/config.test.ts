/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverConfigSchema } from './config';

describe('serverConfigSchema', () => {
  describe('cloudSecurityMetering', () => {
    it('disables CSPM, KSPM and CNVM metering by default', () => {
      expect(serverConfigSchema.validate({}).cloudSecurityMetering).toEqual({
        cspm: { enabled: false },
        kspm: { enabled: false },
        cnvm: { enabled: false },
      });
    });

    it.each(['cspm', 'kspm', 'cnvm'] as const)(
      'enables only %s metering when it is explicitly enabled',
      (solution) => {
        const config = serverConfigSchema.validate({
          cloudSecurityMetering: { [solution]: { enabled: true } },
        });

        expect(config.cloudSecurityMetering).toEqual({
          cspm: { enabled: false },
          kspm: { enabled: false },
          cnvm: { enabled: false },
          [solution]: { enabled: true },
        });
      }
    );
  });
});
