/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Store, AnyAction, Reducer } from 'redux';
import { createStore } from 'redux';
import { analyzerReducer } from '../reducer';
import type { AnalyzerById } from '../../types';
import type { ResolverNode } from '../../../../common/endpoint/types';
import { visibleNodesAndEdgeLines } from '../selectors';
import { mock as mockResolverTree } from '../../models/resolver_tree';
import { mockTreeFetcherParameters } from '../../mocks/tree_fetcher_parameters';
import { endpointSourceSchema } from '../../mocks/tree_schema';
import { mockResolverNode } from '../../mocks/resolver_node';
import { serverReturnedResolverData } from './action';
import { userSetRasterSize } from '../camera/action';
import { EMPTY_RESOLVER } from '../helpers';

describe('resolver visible entities', () => {
  const id = 'test-id';
  let nodeA: ResolverNode;
  let nodeB: ResolverNode;
  let nodeC: ResolverNode;
  let nodeD: ResolverNode;
  let nodeE: ResolverNode;
  let nodeF: ResolverNode;
  let nodeG: ResolverNode;
  let store: Store<AnalyzerById, AnyAction>;

  beforeEach(() => {
    /*
     *          A
     *          |
     *          B
     *          |
     *          C
     *          |
     *          D etc
     */
    nodeA = mockResolverNode({
      name: '',
      id: '0',
      stats: { total: 0, byCategory: {} },
      timestamp: 0,
    });
    nodeB = mockResolverNode({
      id: '1',
      name: '',
      parentID: '0',
      stats: { total: 0, byCategory: {} },
      timestamp: 0,
    });
    nodeC = mockResolverNode({
      id: '2',
      name: '',
      parentID: '1',
      stats: { total: 0, byCategory: {} },
      timestamp: 0,
    });
    nodeD = mockResolverNode({
      id: '3',
      name: '',
      parentID: '2',
      stats: { total: 0, byCategory: {} },
      timestamp: 0,
    });
    nodeE = mockResolverNode({
      id: '4',
      name: '',
      parentID: '3',
      stats: { total: 0, byCategory: {} },
      timestamp: 0,
    });
    nodeF = mockResolverNode({
      id: '5',
      name: '',
      parentID: '4',
      stats: { total: 0, byCategory: {} },
      timestamp: 0,
    });
    nodeF = mockResolverNode({
      id: '6',
      name: '',
      parentID: '5',
      stats: { total: 0, byCategory: {} },
      timestamp: 0,
    });
    nodeG = mockResolverNode({
      id: '7',
      name: '',
      parentID: '6',
      stats: { total: 0, byCategory: {} },
      timestamp: 0,
    });
    const testReducer: Reducer<AnalyzerById, AnyAction> = (
      analyzerState = {
        [id]: EMPTY_RESOLVER,
      },
      action
    ): AnalyzerById => analyzerReducer(analyzerState, action);
    store = createStore(testReducer, undefined);
  });
  describe('when rendering a large tree with a small viewport', () => {
    beforeEach(() => {
      const nodes: ResolverNode[] = [nodeA, nodeB, nodeC, nodeD, nodeE, nodeF, nodeG];
      const { schema, dataSource } = endpointSourceSchema();
      store.dispatch(
        serverReturnedResolverData({
          id,
          result: mockResolverTree({ nodes })!,
          dataSource,
          schema,
          parameters: mockTreeFetcherParameters(),
        })
      );
      store.dispatch(userSetRasterSize({ id, dimensions: [300, 200] }));
    });
    it('the visibleProcessNodePositions list should only include 2 nodes', () => {
      const { processNodePositions } = visibleNodesAndEdgeLines(store.getState()[id])(0);
      expect([...processNodePositions.keys()].length).toEqual(2);
    });
    it('the visibleEdgeLineSegments list should only include one edge line', () => {
      const { connectingEdgeLineSegments } = visibleNodesAndEdgeLines(store.getState()[id])(0);
      expect(connectingEdgeLineSegments.length).toEqual(1);
    });
  });
  describe('when rendering a large tree with a large viewport', () => {
    beforeEach(() => {
      const nodes: ResolverNode[] = [nodeA, nodeB, nodeC, nodeD, nodeE, nodeF, nodeG];
      const { schema, dataSource } = endpointSourceSchema();
      store.dispatch(
        serverReturnedResolverData({
          id,
          result: mockResolverTree({ nodes })!,
          dataSource,
          schema,
          parameters: mockTreeFetcherParameters(),
        })
      );
      store.dispatch(userSetRasterSize({ id, dimensions: [2000, 2000] }));
    });
    it('the visibleProcessNodePositions list should include all process nodes', () => {
      const { processNodePositions } = visibleNodesAndEdgeLines(store.getState()[id])(0);
      expect([...processNodePositions.keys()].length).toEqual(5);
    });
    it('the visibleEdgeLineSegments list include all lines', () => {
      const { connectingEdgeLineSegments } = visibleNodesAndEdgeLines(store.getState()[id])(0);
      expect(connectingEdgeLineSegments.length).toEqual(4);
    });
  });
});
