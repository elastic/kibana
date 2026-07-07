/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PROCESS_COMMANDLINE_FIELD } from '../../../../../common/constants';

export const parseSearchString = (query: string) => {
  if (query.trim() === '') {
    return [
      {
        match_all: {},
      },
    ];
  }
  const elements = query
    .split(' ')
    .map((s) => s.trim())
    .filter(Boolean);
  const stateFilter = elements.filter((s) => s.startsWith('state='));
  const cmdlineFilters = elements.filter((s) => !s.startsWith('state='));
  return [
    ...cmdlineFilters.map((clause) => ({
      query_string: {
        fields: [PROCESS_COMMANDLINE_FIELD],
        query: `*${escapeReservedCharacters(clause)}*`,
        minimum_should_match: 1,
      },
    })),
    ...stateFilter.map((state) => ({
      match: {
        'system.process.state': state.replace('state=', ''),
      },
    })),
  ];
};

const escapeReservedCharacters = (clause: string) =>
  clause.replace(/([+\-=!\(\)\{\}\[\]^"~*?:\\/!]|&&|\|\|)/g, '\\$1');
