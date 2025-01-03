/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum FilterBy {
  Searches = 'Searches',
  NoResults = 'NoResults',
  Clicks = 'Clicks',
  Sessions = 'Sessions',
}
export const getFormulaByFilter = (filter: FilterBy, shift?: string): string => {
  const mapFilterByToFormula: { [key in FilterBy]: string } = {
    [FilterBy.Searches]: "count(search.query, kql='event.action: search'",
    [FilterBy.NoResults]: "count(kql='search.results.total_results : 0 and event.action: search'",
    [FilterBy.Clicks]: "count(kql='event.action: search_click'",
    [FilterBy.Sessions]: 'unique_count(session.id',
  };

  return mapFilterByToFormula[filter] + (shift ? `, shift='${shift}'` : '') + ')';
};
