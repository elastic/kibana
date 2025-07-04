/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockTimelineData } from './mock_timeline_data';

const mockEvents = structuredClone(mockTimelineData);

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
            rawResponse: {},
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
