/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { createEngineDescription } from '../installation/engine_description';
import { buildUpdatesComponentTemplate } from './updates_component_template';

describe('buildUpdatesComponentTemplate', () => {
  it('matches snapshot', () => {
    const description = createEngineDescription({
      entityType: 'host',
      namespace: 'default',
      defaultIndexPatterns: [],
      config: {
        syncDelay: moment.duration(60, 'seconds'),
        frequency: moment.duration(60, 'seconds'),
        developer: {
          pipelineDebugMode: false,
        },
      },
    });

    expect(buildUpdatesComponentTemplate(description)).toMatchSnapshot();
  });
});
