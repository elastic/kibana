/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { AnomalyEntity } from '../../../common/components/ml/anomaly/use_anomalies_search';
import { createTelemetryServiceMock } from '../../../common/lib/telemetry/telemetry_service.mock';
import { TestProviders } from '../../../common/mock';
import { AnomaliesCountLink } from './anomalies_count_link';
import { EntityEventTypes } from '../../../common/lib/telemetry';

const mockedTelemetry = createTelemetryServiceMock();
jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        telemetry: mockedTelemetry,
      },
    }),
  };
});

describe('AnomaliesCountLink', () => {
  it('reports telemetry when clicked', () => {
    const count = 10;
    const jobId = 'test-job-id';

    const { getByRole } = render(
      <AnomaliesCountLink count={count} jobId={jobId} entity={AnomalyEntity.Host} />,
      { wrapper: TestProviders }
    );

    fireEvent.click(getByRole('button'));

    expect(mockedTelemetry.reportEvent).toHaveBeenLastCalledWith(
      EntityEventTypes.AnomaliesCountClicked,
      { jobId, count }
    );
  });
});
