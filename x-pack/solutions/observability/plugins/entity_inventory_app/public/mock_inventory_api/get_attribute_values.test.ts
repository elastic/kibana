/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityInventoryAttributeValues } from './get_attribute_values';

const params = {
  attribute: 'cloud.provider',
  types: ['host.aws_ec2', 'host.gcp_compute_engine', 'host.azure_vm', 'host.vm'],
  filters: {},
  selected: [],
  timeRange: { from: 'now-15m', to: 'now' },
};

describe('getEntityInventoryAttributeValues', () => {
  it('returns the values of the entities of the types in scope', async () => {
    const { values } = await getEntityInventoryAttributeValues(params);

    expect(values).toEqual(['aws', 'azure', 'gcp']);
  });

  it('ignores the entities of other types', async () => {
    const { values } = await getEntityInventoryAttributeValues({
      ...params,
      types: ['host.aws_ec2'],
    });

    expect(values).toEqual(['aws']);
  });

  it('returns no values when no type is in scope', async () => {
    const { values } = await getEntityInventoryAttributeValues({ ...params, types: [] });

    expect(values).toEqual([]);
  });

  it('narrows the values by the other filters', async () => {
    const { values } = await getEntityInventoryAttributeValues({
      ...params,
      filters: { 'os.type': ['windows'] },
    });

    expect(values).toEqual(['azure']);
  });

  it('reports the selected values that no entity of the scope has', async () => {
    const { invalidSelections } = await getEntityInventoryAttributeValues({
      ...params,
      types: ['host.aws_ec2'],
      selected: ['aws', 'gcp'],
    });

    expect(invalidSelections).toEqual(['gcp']);
  });
});
