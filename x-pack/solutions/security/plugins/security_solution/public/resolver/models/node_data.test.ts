/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointDocGenerator } from '../../../common/endpoint/generate_data';
import type { NodeData } from '../types';
import {
  setErrorNodes,
  setReloadedNodes,
  setRequestedNodes,
  updateWithReceivedNodes,
} from './node_data';

describe('node data model', () => {
  const generator = new EndpointDocGenerator('resolver');
  describe('creates a copy of the map', () => {
    const original: Map<string, NodeData> = new Map();

    it('creates a copy when using setRequestedNodes', () => {
      expect(setRequestedNodes(original, new Set()) === original).toBeFalsy();
    });

    it('creates a copy when using setErrorNodes', () => {
      expect(setErrorNodes(original, new Set()) === original).toBeFalsy();
    });

    it('creates a copy when using setReloadedNodes', () => {
      expect(setReloadedNodes(original, '5') === original).toBeFalsy();
    });

    it('creates a copy when using updateWithReceivedNodes', () => {
      expect(
        updateWithReceivedNodes({
          storedNodeInfo: original,
          receivedEvents: [],
          requestedNodes: new Set(),
          numberOfRequestedEvents: 1,
        }) === original
      ).toBeFalsy();
    });
  });

  it('overwrites the existing entries and creates new ones when calling setRequestedNodes', () => {
    const state = new Map<string, NodeData>([
      [
        '1',
        {
          events: [generator.generateEvent({ eventType: ['start'] })],
          status: 'running',
        },
      ],
    ]);

    expect(setRequestedNodes(state, new Set(['1', '2']))).toEqual(
      new Map<string, NodeData>([
        ['1', { events: [], status: 'loading' }],
        ['2', { events: [], status: 'loading' }],
      ])
    );
  });

  it('overwrites the existing entries and creates new ones when calling setErrorNodes', () => {
    const state = new Map<string, NodeData>([
      [
        '1',
        {
          events: [generator.generateEvent({ eventType: ['start'] })],
          status: 'running',
        },
      ],
    ]);

    expect(setErrorNodes(state, new Set(['1', '2']))).toEqual(
      new Map<string, NodeData>([
        ['1', { events: [], status: 'error' }],
        ['2', { events: [], status: 'error' }],
      ])
    );
  });

  describe('setReloadedNodes', () => {
    it('removes the id from the map', () => {
      const state = new Map<string, NodeData>([['1', { events: [], status: 'error' }]]);
      expect(setReloadedNodes(state, '1')).toEqual(new Map());
    });
  });

  describe('updateWithReceivedNodes', () => {
    const node1Events = [generator.generateEvent({ entityID: '1', eventType: ['start'] })];
    const node2Events = [generator.generateEvent({ entityID: '2', eventType: ['start'] })];
    const state = new Map<string, NodeData>([
      ['1', { events: node1Events, status: 'error' }],
      ['2', { events: node2Events, status: 'error' }],
    ]);
    describe('reachedLimit is false', () => {
      it('overwrites entries with the received data', () => {
        const genNodeEvent = generator.generateEvent({ entityID: '1', eventType: ['start'] });

        expect(
          updateWithReceivedNodes({
            storedNodeInfo: state,
            receivedEvents: [genNodeEvent],
            requestedNodes: new Set(['1']),
            // a number greater than the amount received so the reached limit flag with be false
            numberOfRequestedEvents: 10,
          })
        ).toEqual(
          new Map<string, NodeData>([
            ['1', { events: [genNodeEvent], status: 'running' }],
            ['2', { events: node2Events, status: 'error' }],
          ])
        );
      });

      it('initializes entries from the requested nodes even if no data was received', () => {
        expect(
          updateWithReceivedNodes({
            storedNodeInfo: state,
            receivedEvents: [],
            requestedNodes: new Set(['1', '2']),
            numberOfRequestedEvents: 1,
          })
        ).toEqual(
          new Map<string, NodeData>([
            ['1', { events: [], status: 'running' }],
            ['2', { events: [], status: 'running' }],
          ])
        );
      });
    });

    describe('reachedLimit is true', () => {
      it('deletes entries in the map that we did not receive data for', () => {
        expect(
          updateWithReceivedNodes({
            storedNodeInfo: state,
            receivedEvents: [],
            requestedNodes: new Set(['1']),
            numberOfRequestedEvents: 0,
          })
        ).toEqual(new Map<string, NodeData>([['2', { events: node2Events, status: 'error' }]]));
      });

      it('attempts to remove entries from the map even if they do not exist', () => {
        expect(
          updateWithReceivedNodes({
            storedNodeInfo: state,
            receivedEvents: [],
            requestedNodes: new Set(['10']),
            numberOfRequestedEvents: 0,
          })
        ).toEqual(
          new Map<string, NodeData>([
            ['1', { events: node1Events, status: 'error' }],
            ['2', { events: node2Events, status: 'error' }],
          ])
        );
      });

      it('does not delete the entry if it exists in the received node data from the server', () => {
        const genNodeEvent = generator.generateEvent({ entityID: '1', eventType: ['start'] });

        expect(
          updateWithReceivedNodes({
            storedNodeInfo: state,
            receivedEvents: [genNodeEvent],
            requestedNodes: new Set(['1']),
            numberOfRequestedEvents: 1,
          })
        ).toEqual(
          new Map<string, NodeData>([
            ['1', { events: [genNodeEvent], status: 'running' }],
            ['2', { events: node2Events, status: 'error' }],
          ])
        );
      });
    });
  });
});
