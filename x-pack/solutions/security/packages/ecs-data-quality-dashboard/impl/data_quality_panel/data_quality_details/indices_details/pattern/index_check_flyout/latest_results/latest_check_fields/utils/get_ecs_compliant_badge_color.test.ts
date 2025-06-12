/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockPartitionedFieldMetadata } from '../../../../../../../mock/partitioned_field_metadata/mock_partitioned_field_metadata';
import { getEcsCompliantBadgeColor } from './get_ecs_compliant_badge_color';

describe('getEcsCompliantBadgeColor', () => {
  test('it returns the expected color for the ECS compliant data when the data includes an @timestamp', () => {
    expect(getEcsCompliantBadgeColor(mockPartitionedFieldMetadata.ecsCompliant)).toBe('hollow');
  });

  test('it returns the expected color for the ECS compliant data does NOT includes an @timestamp', () => {
    const noTimestamp = mockPartitionedFieldMetadata.ecsCompliant.filter(
      ({ name }) => name !== '@timestamp'
    );

    expect(getEcsCompliantBadgeColor(noTimestamp)).toEqual('danger');
  });
});
