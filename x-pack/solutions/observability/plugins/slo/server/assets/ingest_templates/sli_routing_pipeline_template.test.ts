/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSLIRoutingPipelineTemplate } from './sli_routing_pipeline_template';

describe('getSLIRoutingPipelineTemplate', () => {
  it('routes with a cutover guard', () => {
    expect(
      getSLIRoutingPipelineTemplate(3.6, { before: 'd', after: 'M', cutover: 1796083200000 })
    ).toMatchSnapshot();
  });

  it('routes without a cutover guard', () => {
    expect(
      getSLIRoutingPipelineTemplate(3.6, { before: 'M', after: 'M', cutover: null })
    ).toMatchSnapshot();
  });

  it('uses the index prefix and pipeline name of the given version', () => {
    const template = getSLIRoutingPipelineTemplate(3.7, { before: 'M', after: 'M', cutover: null });

    expect(template.id).toBe('.slo-observability.sli.routing-v3.7');
    expect(template.processors?.[1]?.date_index_name?.index_name_prefix).toBe(
      '.slo-observability.sli-v3.7.'
    );
    expect(template._meta?.version).toBe(3.7);
  });
});
