/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { hashSloId } from '../../lib/telemetry/build_slo_ebt_data';
import { COMPOSITE_SLO_CREATED_EBT_EVENT_TYPE } from '../../lib/telemetry';
import {
  createSloTelemetryReporterMock,
  getReportedEvents,
} from '../../lib/telemetry/slo_telemetry_service.mock';
import {
  createCompositeSLORepositoryMock,
  createSLORepositoryMock,
  createSummaryClientMock,
} from '../mocks';
import { thirtyDaysRolling } from '../fixtures/time_window';
import { createCompositeSlo } from './create_composite_slo';
import { computeAndPersistCompositeSummaryDoc } from './composite_summary_writer';

jest.mock('./composite_summary_writer');

describe('createCompositeSlo', () => {
  const setup = () => {
    const compositeRepository = createCompositeSLORepositoryMock();
    compositeRepository.create.mockImplementation(async (composite) => composite);
    const telemetry = createSloTelemetryReporterMock();
    const dependencies = {
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      compositeRepository,
      repository: createSLORepositoryMock(),
      summaryClient: createSummaryClientMock(),
      logger: loggerMock.create(),
      telemetry,
    };
    return { compositeRepository, telemetry, dependencies };
  };

  const params = {
    id: 'composite-1',
    name: 'Payments composite',
    description: 'Sensitive description',
    members: [
      { sloId: 'slo-id-a', weight: 1, instanceId: 'host-1' },
      { sloId: 'slo-id-b', weight: 2 },
    ],
    compositeMethod: 'weightedAverage' as const,
    timeWindow: thirtyDaysRolling(),
    budgetingMethod: 'occurrences' as const,
    objective: { target: 0.99 },
    spaceId: 'default',
    userId: 'elastic',
  };

  beforeEach(() => jest.clearAllMocks());

  it('reports exactly one composite_slo_created event without raw ids, names or descriptions', async () => {
    const { telemetry, dependencies } = setup();

    await createCompositeSlo(params, dependencies);

    const events = getReportedEvents(telemetry);
    expect(events).toEqual([
      [
        COMPOSITE_SLO_CREATED_EBT_EVENT_TYPE,
        {
          composite_slo_id: hashSloId('composite-1'),
          members_count: 2,
          members_with_instance_id_count: 1,
        },
      ],
    ]);
    expect(JSON.stringify(events)).not.toContain('Payments composite');
    expect(JSON.stringify(events)).not.toContain('Sensitive description');
  });

  it('stores Date timestamps and returns the wire form', async () => {
    const { compositeRepository, dependencies } = setup();

    const result = await createCompositeSlo(params, dependencies);

    const stored = compositeRepository.create.mock.calls[0][0];
    expect(stored.createdAt).toBeInstanceOf(Date);
    expect(stored.updatedAt).toEqual(stored.createdAt);
    expect(result.timeWindow).toEqual({ duration: '30d', type: 'rolling' });
    expect(result.createdAt).toBe(stored.createdAt.toISOString());
    expect(result.updatedAt).toBe(stored.updatedAt.toISOString());
  });

  it('does not report when creating the definition fails', async () => {
    const { compositeRepository, telemetry, dependencies } = setup();
    compositeRepository.create.mockRejectedValueOnce(new Error('conflict'));

    await expect(createCompositeSlo(params, dependencies)).rejects.toThrow('conflict');

    expect(telemetry.report).not.toHaveBeenCalled();
  });

  it('still reports when persisting the summary doc fails after the definition is stored', async () => {
    const { telemetry, dependencies } = setup();
    (computeAndPersistCompositeSummaryDoc as jest.Mock).mockRejectedValueOnce(new Error('boom'));

    await expect(createCompositeSlo(params, dependencies)).rejects.toThrow('boom');

    expect(telemetry.report).toHaveBeenCalledTimes(1);
  });
});
