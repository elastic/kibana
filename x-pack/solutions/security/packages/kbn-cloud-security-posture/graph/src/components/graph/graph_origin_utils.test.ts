/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeViewModel } from '../types';
import { isOriginEntityOrEventNode } from './graph_origin_utils';

describe('graph_origin_utils', () => {
  describe('isOriginEntityOrEventNode', () => {
    it('returns true for origin entity nodes', () => {
      const node = {
        id: 'entity-1',
        shape: 'ellipse',
        color: 'primary',
        isOrigin: true,
      } as NodeViewModel;

      expect(isOriginEntityOrEventNode(node)).toBe(true);
    });

    it('returns true for origin event and alert label nodes', () => {
      expect(
        isOriginEntityOrEventNode({
          id: 'event-1',
          shape: 'label',
          color: 'primary',
          isOrigin: true,
        } as NodeViewModel)
      ).toBe(true);

      expect(
        isOriginEntityOrEventNode({
          id: 'alert-1',
          shape: 'label',
          color: 'danger',
          isOriginAlert: true,
        } as NodeViewModel)
      ).toBe(true);
    });

    it('returns false for relationship and expanded entity nodes', () => {
      expect(
        isOriginEntityOrEventNode({
          id: 'rel-1',
          shape: 'relationship',
          color: 'primary',
          isOrigin: true,
        } as NodeViewModel)
      ).toBe(false);

      expect(
        isOriginEntityOrEventNode({
          id: 'entity-2',
          shape: 'rectangle',
          color: 'primary',
        } as NodeViewModel)
      ).toBe(false);
    });
  });
});
