/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createConfig } from './create_config';

const buildContext = (pluginConfig: { enabled: boolean; enableExperimental: string[] }) =>
  ({
    config: { get: () => pluginConfig },
    logger: { get: () => ({ warn: jest.fn() }) },
  } as unknown as Parameters<typeof createConfig>[0]);

describe('createConfig', () => {
  it('attaches all-default experimentalFeatures when enableExperimental is empty', () => {
    const config = createConfig(buildContext({ enabled: true, enableExperimental: [] }));

    expect(config.experimentalFeatures).toEqual({ workerAgentPickerEnabled: false });
    expect(config.enabled).toBe(true);
  });

  it('turns on the picker flag when listed in enableExperimental', () => {
    const config = createConfig(
      buildContext({ enabled: true, enableExperimental: ['workerAgentPickerEnabled'] })
    );

    expect(config.experimentalFeatures.workerAgentPickerEnabled).toBe(true);
  });

  it('warns once per invalid enableExperimental value without throwing', () => {
    const warn = jest.fn();
    const logger = { warn } as unknown as Parameters<typeof createConfig>[1];

    const config = createConfig(
      buildContext({ enabled: true, enableExperimental: ['notARealFlag'] }),
      logger
    );

    expect(config.experimentalFeatures).toEqual({ workerAgentPickerEnabled: false });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('notARealFlag');
  });
});
