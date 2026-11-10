/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { SloTelemetryReporter } from '../../../lib/telemetry';
import { createSloTelemetryReporterMock } from '../../../lib/telemetry/slo_telemetry_service.mock';
import { DeleteSLO } from '../../delete_slo';
import {
  createSLORepositoryMock,
  createSummaryTransformManagerMock,
  createTransformManagerMock,
} from '../../mocks';
import { runBulkDelete } from './run_bulk_delete';

describe('runBulkDelete', () => {
  let telemetry: jest.Mocked<SloTelemetryReporter>;
  let deleteSLO: DeleteSLO;
  let executeSpy: jest.SpyInstance;

  beforeEach(() => {
    telemetry = createSloTelemetryReporterMock();
    deleteSLO = new DeleteSLO(
      createSLORepositoryMock(),
      createTransformManagerMock(),
      createSummaryTransformManagerMock(),
      elasticsearchServiceMock.createScopedClusterClient(),
      rulesClientMock.create(),
      loggingSystemMock.createLogger(),
      telemetry
    );
    executeSpy = jest
      .spyOn(deleteSLO, 'execute')
      .mockImplementation(async (sloId) =>
        sloId === 'failing-slo' ? Promise.reject(new Error('boom')) : undefined
      );
  });

  it('deletes each SLO as part of a bulk deletion', async () => {
    const results = await runBulkDelete(
      { list: ['slo-1', 'failing-slo', 'slo-2'] },
      {
        deleteSLO,
        scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
        rulesClient: rulesClientMock.create(),
        logger: loggingSystemMock.createLogger(),
        signal: new AbortController().signal,
      }
    );

    expect(results).toEqual([
      { id: 'slo-1', success: true },
      { id: 'failing-slo', success: false, error: 'boom' },
      { id: 'slo-2', success: true },
    ]);
    expect(executeSpy).toHaveBeenCalledTimes(3);
    executeSpy.mock.calls.forEach(([, options]) => {
      expect(options).toEqual({ skipRuleDeletion: true, skipDataDeletion: true, bulk: true });
    });
  });
});
