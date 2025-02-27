import { elasticsearchServiceMock, savedObjectsClientMock, loggingSystemMock } from "@kbn/core/server/mocks";
import { PrivilegeMonitoringDataClient } from "./privilege_monitoring_data_client";

describe('Privilege Monitoring Data Client', () => {
  const mockSavedObjectClient = savedObjectsClientMock.create();
  const clusterClientMock = elasticsearchServiceMock.createScopedClusterClient();
  const loggerMock = loggingSystemMock.createLogger();
  const dataClient = new PrivilegeMonitoringDataClient({ 
    logger: loggerMock, 
    clusterClient: clusterClientMock, 
    namespace: 'default', 
    soClient: mockSavedObjectClient,
    kibanaVersion: '8.0.0'
  });
});