/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSLIRoutingPipelineTemplate } from './sli_routing_pipeline_template';

describe('getSLIRoutingPipelineTemplate', () => {
  it('routes with the rounding segments', () => {
    expect(
      getSLIRoutingPipelineTemplate(3.6, {
        segments: [
          { from: null, rounding: 'd' },
          { from: 1796083200000, rounding: 'M' },
        ],
      })
    ).toMatchSnapshot();
  });

  it('uses the index prefix and pipeline name of the given version', () => {
    const template = getSLIRoutingPipelineTemplate(3.7, {
      segments: [{ from: null, rounding: 'M' }],
    });

    const dateIndexName = template.processors?.find(
      (processor) => processor?.date_index_name !== undefined
    )?.date_index_name;

    expect(template.id).toBe('.slo-observability.sli.routing-v3.7');
    expect(dateIndexName?.index_name_prefix).toBe('.slo-observability.sli-v3.7.');
    expect(template._meta?.version).toBe(3.7);
  });
});
