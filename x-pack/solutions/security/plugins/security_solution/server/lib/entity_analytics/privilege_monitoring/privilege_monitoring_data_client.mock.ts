/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrivilegeMonitoringDataClient } from './privilege_monitoring_data_client';

const createPrivilegeMonitorDataClientMock = () =>
  ({
    init: jest.fn(),
    disable: jest.fn(),
  } as unknown as jest.Mocked<PrivilegeMonitoringDataClient>);

export const privilegeMonitorDataClientMock = { create: createPrivilegeMonitorDataClientMock };
