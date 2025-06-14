/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSLO } from '../../services/fixtures/slo';
import { getSLIPipelineTemplate } from './sli_pipeline_template';

describe('getSLIPipelineTemplate', () => {
  it('handles slo with groupBy having empty string', () => {
    const slo = createSLO({
      id: 'irrelevant',
      groupBy: [''],
    });

    expect(getSLIPipelineTemplate(slo, 'default')).toMatchSnapshot();
  });

  it('handles slo with many fields as groupBy', () => {
    const slo = createSLO({
      id: 'irrelevant',
      groupBy: ['host.name', 'some.labelId'],
    });

    expect(getSLIPipelineTemplate(slo, 'default')).toMatchSnapshot();
  });
});
