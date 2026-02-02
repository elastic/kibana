/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IBasePath } from '@kbn/core-http-server';
import { createSLO, createSLOWithTimeslicesBudgetingMethod } from '../../services/fixtures/slo';
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
  it('includes the global custom pipeline processor', () => {
    const slo = createSLO({ id: 'test-slo' });
    const basePath = createMockBasePath('https://my-kibana.com');

    const template = getSummaryPipelineTemplate(slo, 'default', basePath);

    expect(template.processors).toContainEqual({
      pipeline: {
        description: 'Global custom pipeline for all SLO summary data',
        ignore_missing_pipeline: true,
        ignore_failure: true,
        name: 'slo-summary-global@custom',
      },
    });
  });

  it('includes the per-SLO custom pipeline processor', () => {
    const slo = createSLO({ id: 'my-custom-slo-id' });
    const basePath = createMockBasePath('https://my-kibana.com');

    const template = getSummaryPipelineTemplate(slo, 'default', basePath);

    expect(template.processors).toContainEqual({
      pipeline: {
        ignore_missing_pipeline: true,
        ignore_failure: true,
        name: 'slo-summary-my-custom-slo-id@custom',
      },
    });
  });

  it('includes timeslice processors for timeslices budgeting method', () => {
    const slo = createSLOWithTimeslicesBudgetingMethod({ id: 'test-slo' });
    const basePath = createMockBasePath('https://my-kibana.com');

    const template = getSummaryPipelineTemplate(slo, 'default', basePath);

    const hasTimesliceTarget = template.processors?.some(
      (p) => 'set' in p && p.set?.field === 'slo.objective.timesliceTarget'
    );
    const hasTimesliceWindow = template.processors?.some(
      (p) => 'set' in p && p.set?.field === 'slo.objective.timesliceWindow'
    );

    expect(hasTimesliceTarget).toBe(true);
    expect(hasTimesliceWindow).toBe(true);
  });
});
