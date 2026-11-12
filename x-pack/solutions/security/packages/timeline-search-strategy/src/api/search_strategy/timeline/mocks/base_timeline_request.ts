/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockBaseTimelineRequest = {
  id: 'Fnh1dVQ4SDRTUldtRXpUcDEwZXliWHcdZXdlWVBFWkVSWHVIdzY4a19JbFRvUTozMzgzNzk=',
  defaultIndex: ['*-large-index'],
  filterQuery:
    '{"bool":{"must":[],"filter":[{"bool":{"should":[{"exists":{"field":"host.name"}}],"minimum_should_match":1}},{"range":{"@timestamp":{"gte":"2019-02-13T15:39:10.392Z","lt":"2024-02-14T04:59:59.999Z","format":"strict_date_optional_time"}}}],"should":[],"must_not":[]}}',
  runtimeMappings: {},
  timerange: {
    interval: '12h',
    from: '2019-02-13T15:39:10.392Z',
    to: '2024-02-14T04:59:59.999Z',
  },
  entityType: 'events',
};
