/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has, merge } from 'lodash/fp';
import { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { EventHit } from '../../../../../common/search_strategy';
import { ECS_METADATA_FIELDS, TIMELINE_EVENTS_FIELDS } from './constants';
import { getTimestamp } from './get_timestamp';
import { buildObjectRecursive } from './build_object_recursive';
import { getNestedParentPath } from './get_nested_parent_path';

export const buildEcsObjects = (hit: EventHit): Ecs => {
  const ecsFields = [...TIMELINE_EVENTS_FIELDS];
  return ecsFields.reduce(
    (acc, field) => {
      const nestedParentPath = getNestedParentPath(field, hit.fields);
      if (
        nestedParentPath != null ||
        has(field, hit.fields) ||
        ECS_METADATA_FIELDS.includes(field)
      ) {
        return merge(acc, buildObjectRecursive(field, hit.fields));
      }
      return acc;
    },
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    { _id: hit._id!, timestamp: getTimestamp(hit), _index: hit._index }
  );
};
