/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTotalCountFromTables } from './get_total_count_from_tables';
import { useVisualizationResponseMock } from './use_visualization_response.mock';

describe('getTotalCountFromTables', () => {
  it('returns the total count from all layers', () => {
    const visualizationResponse = useVisualizationResponseMock.buildOkResponse({ tableCount: 3 });
    const result = getTotalCountFromTables(visualizationResponse.tables.tables);
    expect(result).toEqual(3);
  });
});
