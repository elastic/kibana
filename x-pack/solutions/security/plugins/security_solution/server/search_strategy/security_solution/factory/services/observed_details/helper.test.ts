/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceAggEsItem } from '../../../../../../common/search_strategy/security_solution/services/common';
import { fieldNameToAggField, formatServiceItem } from './helpers';

describe('helpers', () => {
  it('it convert field name to aggregation field name', () => {
    expect(fieldNameToAggField('service.node.role')).toBe('service_node_role');
  });

  it('it formats ServiceItem', () => {
    const serviceId = '123';
    const aggregations: ServiceAggEsItem = {
      service_id: {
        buckets: [
          {
            key: serviceId,
            doc_count: 1,
          },
        ],
      },
    };

    expect(formatServiceItem(aggregations)).toEqual({
      service: { id: [serviceId] },
    });
  });
});
