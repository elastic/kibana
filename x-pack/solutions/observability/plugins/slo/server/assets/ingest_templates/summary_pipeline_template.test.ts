/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IBasePath } from '@kbn/core-http-server';
import {
  createSLO,
  createSLOWithTimeslicesBudgetingMethod,
  createSLOWithCalendarTimeWindow,
} from '../../services/fixtures/slo';
import { getSummaryPipelineTemplate } from './summary_pipeline_template';

const createMockBasePath = (publicBaseUrl?: string): IBasePath => {
  return {
    publicBaseUrl,
    get: jest.fn(),
    set: jest.fn(),
    prepend: jest.fn(),
    remove: jest.fn(),
    serverBasePath: '',
    assetsHrefBase: '',
  } as unknown as IBasePath;
};

describe('getSummaryPipelineTemplate', () => {
  it('generates pipeline for SLO with occurrences budgeting method', () => {
    const slo = createSLO({
      id: 'test-slo',
    });
    const basePath = createMockBasePath('https://my-kibana.com');

    expect(getSummaryPipelineTemplate(slo, 'default', basePath)).toMatchSnapshot();
  });

  it('generates pipeline for SLO with timeslices budgeting method', () => {
    const slo = createSLOWithTimeslicesBudgetingMethod({
      id: 'test-slo-timeslices',
    });
    const basePath = createMockBasePath('https://my-kibana.com');

    expect(getSummaryPipelineTemplate(slo, 'default', basePath)).toMatchSnapshot();
  });

  it('generates pipeline for SLO with calendar aligned time window', () => {
    const slo = createSLOWithCalendarTimeWindow({
      id: 'test-slo-calendar',
    });
    const basePath = createMockBasePath('https://my-kibana.com');

    expect(getSummaryPipelineTemplate(slo, 'default', basePath)).toMatchSnapshot();
  });

  it('handles missing publicBaseUrl', () => {
    const slo = createSLO({
      id: 'test-slo-no-url',
    });
    const basePath = createMockBasePath(undefined);

    expect(getSummaryPipelineTemplate(slo, 'default', basePath)).toMatchSnapshot();
  });
});
