/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockTimelineData } from './mock_timeline_data';

const mockEvents = structuredClone(mockTimelineData);

/** The index of the raw hits, for the events of the fixture that have none. */
export const MOCK_TIMELINE_HIT_INDEX = '.ds-logs-endpoint.events.network-default-2021.09.28-000001';

/*
 * This helps to mock `data.search.search` method to mock the timeline data
 * */
export const getMockTimelineSearchSubscription = () => {
  const mockSearchWithArgs = jest.fn();

  const mockTimelineSearchSubscription = jest.fn().mockImplementation((args) => {
    mockSearchWithArgs(args);
    return {
      subscribe: jest.fn().mockImplementation(({ next }) => {
        const start = args.pagination.activePage * args.pagination.querySize;
        const end = start + args.pagination.querySize;
        const timelineOut = setTimeout(() => {
          next({
            isRunning: false,
            isPartial: false,
            inspect: {
              dsl: [],
              response: [],
            },
            edges: mockEvents.map((item) => ({ node: item })).slice(start, end),
            pageInfo: {
              activePage: args.pagination.activePage,
              querySize: args.pagination.querySize,
            },
            rawResponse: {
              hits: {
                hits: mockEvents.slice(start, end).map(({ _id, _index }) => ({
                  _id,
                  _index: _index ?? MOCK_TIMELINE_HIT_INDEX,
                  _source: {},
                })),
              },
            },
            totalCount: mockEvents.length,
          });
        }, 50);
        return {
          unsubscribe: jest.fn(() => {
            clearTimeout(timelineOut);
          }),
        };
      }),
    };
  });

  return { mockTimelineSearchSubscription, mockSearchWithArgs };
};
