/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseConnector, CasePostRequest } from '@kbn/cases-plugin/common/api';
import { v4 as uuid } from 'uuid';

export function generateRandomCaseWithoutConnector(): CasePostRequest {
  return {
    title: 'random-' + uuid.v4(),
    tags: ['test', uuid.v4()],
    description: 'This is a description with id: ' + uuid.v4(),
    connector: {
      id: 'none',
      name: 'none',
      type: '.none',
      fields: null,
    } as CaseConnector,
    settings: {
      syncAlerts: false,
    },
    owner: 'cases',
  };
}
