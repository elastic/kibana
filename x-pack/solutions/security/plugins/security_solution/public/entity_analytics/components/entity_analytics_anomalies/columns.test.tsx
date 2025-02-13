/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { AnomalyEntity } from '../../../common/components/ml/anomaly/use_anomalies_search';
import type { SecurityJob } from '../../../common/components/ml_popover/types';
import { useAnomaliesColumns } from './columns';

describe('useAnomaliesColumns', () => {
  it('renders unstyled jobName when count is zero and job id is present on recentlyEnabledJobIds', () => {
    const jobName = 'test-job-name';
    const job = { id: 'test-id-1' } as SecurityJob;
    const { result } = renderHook(() => useAnomaliesColumns(false, jest.fn(), [job.id]));

    const nameColumn = result.current[0];
    const renderedComponent = nameColumn.render?.(jobName, {
      count: 0,
      job,
      name: jobName,
      entity: AnomalyEntity.Host,
    });

    expect(renderedComponent).toEqual(jobName);
  });

  it("renders styled jobName when the count is zero and job hasn't started", () => {
    const jobName = 'test-job-name';
    const count = 0;
    const job = {
      id: 'test-id-1',
      jobState: 'closed',
      datafeedState: 'stopped',
    } as SecurityJob;
    const { result } = renderHook(() => useAnomaliesColumns(false, jest.fn(), []));

    const nameColumn = result.current[0];
    const renderedComponent = nameColumn.render?.(jobName, {
      count,
      job,
      name: jobName,
      entity: AnomalyEntity.Host,
    });

    expect(renderedComponent).toMatchInlineSnapshot(`
      <Styled(span)>
        test-job-name
      </Styled(span)>
    `);
  });
});
