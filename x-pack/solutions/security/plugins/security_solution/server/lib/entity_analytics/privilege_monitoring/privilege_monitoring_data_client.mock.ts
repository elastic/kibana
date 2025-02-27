
import type { PrivilegeMonitoringDataClient } from './privilege_monitoring_data_client';

const createPrivilegeMonitorDataClientMock = () =>
  ({
    init: jest.fn(),
  } as unknown as jest.Mocked<PrivilegeMonitoringDataClient>);

export const privilegeMonitorDataClientMock = { create: createPrivilegeMonitorDataClientMock };
