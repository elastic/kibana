/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { TimelineId } from '../../../../../../../common/types/timeline';
import { RowRendererIdEnum } from '../../../../../../../common/api/timeline';
import { combineRenderers } from '.';

describe('combineRenderers', () => {
  const contextId = 'abcd';

  const a = {
    id: RowRendererIdEnum.netflow,
    isInstance: jest.fn(),
    renderRow: jest.fn(),
  };

  const b = {
    id: RowRendererIdEnum.registry,
    isInstance: jest.fn(),
    renderRow: jest.fn(),
  };

  const data: Ecs = {
    _id: 'abcd',
  };

  beforeEach(() => jest.clearAllMocks());

  it('returns a renderer with the expected id', () => {
    const id = RowRendererIdEnum.library; // typically id from 'a', or 'b', but it can be any value

    expect(combineRenderers({ a, b, id }).id).toEqual(id);
  });

  describe('isInstance', () => {
    it('returns true when `a` is an instance and `b` is an instance', () => {
      a.isInstance.mockReturnValue(true);
      b.isInstance.mockReturnValue(true);

      expect(combineRenderers({ a, b, id: a.id }).isInstance(data)).toBe(true);
    });

    it('returns true when `a` is an instance and `b` is NOT an instance', () => {
      a.isInstance.mockReturnValue(true);
      b.isInstance.mockReturnValue(false);

      expect(combineRenderers({ a, b, id: a.id }).isInstance(data)).toBe(true);
    });

    it('returns true when `a` is NOT an instance and `b` is an instance', () => {
      a.isInstance.mockReturnValue(false);
      b.isInstance.mockReturnValue(true);

      expect(combineRenderers({ a, b, id: a.id }).isInstance(data)).toBe(true);
    });

    it('returns false when `a` is NOT an instance and `b` is NOT an instance', () => {
      a.isInstance.mockReturnValue(false);
      b.isInstance.mockReturnValue(false);

      expect(combineRenderers({ a, b, id: a.id }).isInstance(data)).toBe(false);
    });
  });

  describe('renderRow', () => {
    const scopeId = TimelineId.test;

    it('renders `a` and `b` when `a` is an instance and `b` is an instance', () => {
      a.isInstance.mockReturnValue(true);
      b.isInstance.mockReturnValue(true);

      combineRenderers({ a, b, id: a.id }).renderRow({
        contextId,
        data,
        scopeId,
      });

      expect(a.renderRow).toBeCalledWith({
        contextId,
        data,
        scopeId,
      });
      expect(b.renderRow).toBeCalledWith({
        contextId,
        data,
        scopeId,
      });
    });

    it('renders (only) `a` when `a` is an instance and `b` is NOT an instance', () => {
      a.isInstance.mockReturnValue(true);
      b.isInstance.mockReturnValue(false);

      combineRenderers({ a, b, id: a.id }).renderRow({
        contextId,
        data,
        scopeId,
      });

      expect(a.renderRow).toBeCalledWith({
        contextId,
        data,
        scopeId,
      });
      expect(b.renderRow).not.toBeCalled();
    });

    it('renders (only) `b` when `a` is NOT an instance and `b` is an instance', () => {
      a.isInstance.mockReturnValue(false);
      b.isInstance.mockReturnValue(true);

      combineRenderers({ a, b, id: a.id }).renderRow({
        contextId,
        data,
        scopeId,
      });

      expect(a.renderRow).not.toBeCalled();
      expect(b.renderRow).toBeCalledWith({
        contextId,
        data,
        scopeId,
      });
    });

    it('renders NEITHER `a`, nor `b` when `a` is NOT an instance and `b` is NOT an instance', () => {
      a.isInstance.mockReturnValue(false);
      b.isInstance.mockReturnValue(false);

      expect(a.renderRow).not.toBeCalled();
      expect(b.renderRow).not.toBeCalled();
    });
  });
});
