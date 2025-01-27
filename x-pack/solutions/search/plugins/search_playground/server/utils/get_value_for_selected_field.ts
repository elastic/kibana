/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { get, has } from 'lodash';

export const getValueForSelectedField = (hit: SearchHit, path: string): string => {
  if (!hit) {
    return '';
  }

  // for semantic_text matches
  if (hit.highlight && hit.highlight[path]) {
    return hit.highlight[path].flat().join('\n --- \n');
  }

  return has(hit._source, `${path}.text`)
    ? get(hit._source, `${path}.text`, '')
    : get(hit._source, path, '');
};
