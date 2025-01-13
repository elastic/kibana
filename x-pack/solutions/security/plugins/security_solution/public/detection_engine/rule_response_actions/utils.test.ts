/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOsqueryQueriesFromNote } from './utils';

describe('getOsqueryQueriesFromNote', () => {
  it('should transform investigation guide note into osquery queries', () => {
    const note =
      '!{osquery{"query":"SELECT * FROM processes where pid = {{ process.pid }};","label":"Get processes","ecs_mapping":{"process.pid":{"field":"pid"},"process.name":{"field":"name"},"process.executable":{"field":"path"},"process.args":{"field":"cmdline"},"process.working_directory":{"field":"cwd"},"user.id":{"field":"uid"},"group.id":{"field":"gid"},"process.parent.pid":{"field":"parent"},"process.pgid":{"field":"pgroup"}}}}\n\n!{osquery{"query":"select * from users;","label":"Get users"}}';
    const queries = getOsqueryQueriesFromNote(note);
    const expectedQueries = [
      {
        type: 'osquery',
        configuration: {
          query: 'SELECT * FROM processes where pid = {{ process.pid }};',
          label: 'Get processes',
          ecs_mapping: {
            'process.pid': {
              field: 'pid',
            },
            'process.name': {
              field: 'name',
            },
            'process.executable': {
              field: 'path',
            },
            'process.args': {
              field: 'cmdline',
            },
            'process.working_directory': {
              field: 'cwd',
            },
            'user.id': {
              field: 'uid',
            },
            'group.id': {
              field: 'gid',
            },
            'process.parent.pid': {
              field: 'parent',
            },
            'process.pgid': {
              field: 'pgroup',
            },
          },
        },
        position: {
          start: {
            line: 1,
            column: 1,
            offset: 0,
          },
          end: {
            line: 1,
            column: 423,
            offset: 422,
          },
          indent: [],
        },
      },
      {
        type: 'osquery',
        configuration: {
          query: 'select * from users;',
          label: 'Get users',
        },
        position: {
          start: {
            line: 3,
            column: 1,
            offset: 424,
          },
          end: {
            line: 3,
            column: 63,
            offset: 486,
          },
          indent: [],
        },
      },
    ];

    expect(queries).toEqual(expectedQueries);
  });
});
