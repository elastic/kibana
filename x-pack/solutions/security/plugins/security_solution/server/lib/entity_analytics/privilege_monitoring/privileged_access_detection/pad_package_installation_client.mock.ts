/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PadPackageInstallationClient } from './pad_package_installation_client';

const createPadPackageInstallationClientMock = () =>
  ({
    init: jest.fn(),
  } as unknown as jest.Mocked<PadPackageInstallationClient>);

export const padPackageInstallationClientMock = { create: createPadPackageInstallationClientMock };
