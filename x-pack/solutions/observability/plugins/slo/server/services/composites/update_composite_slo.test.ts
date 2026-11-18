/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { createCompositeSlo } from '../fixtures/composite_slo';
import { hashSloId } from '../../lib/telemetry/build_slo_ebt_data';
import { COMPOSITE_SLO_UPDATED_EBT_EVENT_TYPE } from '../../lib/telemetry';
import {
  createSloTelemetryReporterMock,
  getReportedEvents,
} from '../../lib/telemetry/slo_telemetry_service.mock';
import {
  createCompositeSLORepositoryMock,
  createSLORepositoryMock,
  createSummaryClientMock,
} from '../mocks';
import { updateCompositeSlo } from './update_composite_slo';

jest.mock('./composite_summary_writer');

describe('updateCompositeSlo', () => {
  const existing = createCompositeSlo({
    id: 'composite-1',
    members: [
      { sloId: 'slo-a', weight: 1 },
      { sloId: 'slo-b', weight: 2 },
    ],
  });

  const setup = () => {
    const compositeRepository = createCompositeSLORepositoryMock();
    compositeRepository.findById.mockResolvedValue(existing);
    compositeRepository.update.mockImplementation(async (composite) => composite);
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

  const base = { id: 'composite-1', spaceId: 'default', userId: 'elastic' };

  it('reports exactly one composite_slo_updated event with the changed fields', async () => {
    const { telemetry, dependencies } = setup();

    await updateCompositeSlo(
      {
        ...base,
        name: 'Renamed',
        tags: ['new'],
        members: [
          { sloId: 'slo-a', weight: 1 },
          { sloId: 'slo-b', weight: 2 },
          { sloId: 'slo-c', weight: 1, instanceId: 'host-1' },
        ],
      },
      dependencies
    );

    expect(getReportedEvents(telemetry)).toEqual([
      [
        COMPOSITE_SLO_UPDATED_EBT_EVENT_TYPE,
        {
          composite_slo_id: hashSloId('composite-1'),
          members_count: 3,
          members_with_instance_id_count: 1,
          changed_fields: ['name', 'members', 'tags'],
        },
      ],
    ]);
  });

  it('reports no changed fields when only the member order changes', async () => {
    const { telemetry, dependencies } = setup();

    await updateCompositeSlo({ ...base, members: [...existing.members].reverse() }, dependencies);

    expect(getReportedEvents(telemetry)).toEqual([
      [COMPOSITE_SLO_UPDATED_EBT_EVENT_TYPE, expect.objectContaining({ changed_fields: [] })],
    ]);
  });

  it('does not report when the composite SLO does not exist', async () => {
    const { compositeRepository, telemetry, dependencies } = setup();
    compositeRepository.findById.mockRejectedValueOnce(new Error('not found'));

    await expect(updateCompositeSlo({ ...base, name: 'x' }, dependencies)).rejects.toThrow(
      'not found'
    );

    expect(telemetry.report).not.toHaveBeenCalled();
  });

  it('does not report when updating the definition fails', async () => {
    const { compositeRepository, telemetry, dependencies } = setup();
    compositeRepository.update.mockRejectedValueOnce(new Error('conflict'));

    await expect(updateCompositeSlo({ ...base, name: 'x' }, dependencies)).rejects.toThrow(
      'conflict'
    );

    expect(telemetry.report).not.toHaveBeenCalled();
  });
});
