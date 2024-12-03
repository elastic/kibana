/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { MockedLogger } from '@kbn/logging-mocks';
import { createResourceInstallerMock } from './mocks';
import { DefaultSLOInstaller } from './slo_installer';

describe('SLO Installer', () => {
  let loggerMock: jest.Mocked<MockedLogger>;

  beforeEach(() => {
    loggerMock = loggingSystemMock.createLogger();
  });

  it.skip('handles concurrent installation', async () => {
    const resourceInstaller = createResourceInstallerMock();
    const service = new DefaultSLOInstaller(resourceInstaller, loggerMock);

    await Promise.all([service.install(), service.install()]);

    expect(resourceInstaller.ensureCommonResourcesInstalled).toHaveBeenCalledTimes(1);
  });
});
