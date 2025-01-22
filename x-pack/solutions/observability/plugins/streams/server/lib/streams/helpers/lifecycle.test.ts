/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WiredStreamDefinition } from '@kbn/streams-schema';
import { findInheritedLifecycle, findInheritingStreams } from './lifecycle';

describe(__filename, () => {
  describe('findInheritedLifecycle', () => {
    describe('picks the definition lifecycle', () => {
      const definition = {
        name: 'one.two',
        stream: { ingest: { lifecycle: { type: 'dlm', data_retention: '1d' } } },
      } as WiredStreamDefinition;
      const ascendants = [
        {
          name: 'one',
          stream: { ingest: { lifecycle: { type: 'ilm', policy: 'policy' } } },
        } as WiredStreamDefinition,
      ] as WiredStreamDefinition[];

      const lifecycle = findInheritedLifecycle(definition, ascendants);

      expect(lifecycle).toEqual({
        from: 'one.two',
        type: 'dlm',
        data_retention: '1d',
      });
    });

    describe('picks the nearest parent lifecycle', () => {
      const definition = {
        name: 'one.two.three.four',
        stream: { ingest: {} },
      } as WiredStreamDefinition;
      const ascendants = [
        {
          name: 'one',
          stream: { ingest: { lifecycle: { type: 'ilm', policy: 'one' } } },
        } as WiredStreamDefinition,
        {
          name: 'one.two.three',
          stream: { ingest: {} },
        } as WiredStreamDefinition,
        {
          name: 'one.two',
          stream: { ingest: { lifecycle: { type: 'dlm', data_retention: '1d' } } },
        } as WiredStreamDefinition,
      ] as WiredStreamDefinition[];

      const lifecycle = findInheritedLifecycle(definition, ascendants);

      expect(lifecycle).toEqual({
        from: 'one.two',
        type: 'dlm',
        data_retention: '1d',
      });
    });

    describe('return undefined', () => {
      const definition = { name: 'one.two.three', stream: { ingest: {} } } as WiredStreamDefinition;
      const ascendants = [
        { name: 'one.two', stream: { ingest: {} } } as WiredStreamDefinition,
        { name: 'one', stream: { ingest: {} } } as WiredStreamDefinition,
      ] as WiredStreamDefinition[];

      const lifecycle = findInheritedLifecycle(definition, ascendants);

      expect(lifecycle).toEqual(undefined);
    });
  });

  describe('findInheritingStreams', () => {
    it('returns all streams', () => {
      const definition = {
        name: 'one',
        stream: {
          ingest: {
            lifecycle: { type: 'dlm', data_retention: '1d' },
          },
        },
      } as WiredStreamDefinition;
      const descendants = [
        { name: 'one.two.three', stream: { ingest: {} } } as WiredStreamDefinition,
        { name: 'one.two2', stream: { ingest: {} } } as WiredStreamDefinition,
        { name: 'one.two', stream: { ingest: {} } } as WiredStreamDefinition,
        { name: 'one.two2.three', stream: { ingest: {} } } as WiredStreamDefinition,
        { name: 'one.two2.three.four', stream: { ingest: {} } } as WiredStreamDefinition,
      ] as WiredStreamDefinition[];

      const inheritingStreams = findInheritingStreams(definition, descendants);

      expect(inheritingStreams).toEqual(
        expect.arrayContaining([
          'one',
          'one.two.three',
          'one.two2',
          'one.two',
          'one.two2.three',
          'one.two2.three.four',
        ])
      );
    });

    it('ignores subtrees with overrides', () => {
      const definition = {
        name: 'one',
        stream: {
          ingest: {
            lifecycle: { type: 'dlm', data_retention: '1d' },
          },
        },
      } as WiredStreamDefinition;
      const descendants = [
        {
          name: 'one.override',
          stream: { ingest: { lifecycle: { type: 'ilm', policy: 'policy ' } } },
        } as WiredStreamDefinition,
        { name: 'one.override.deeply', stream: { ingest: {} } } as WiredStreamDefinition,
        { name: 'one.override.deeply.nested', stream: { ingest: {} } } as WiredStreamDefinition,
        { name: 'one.inheriting', stream: { ingest: {} } } as WiredStreamDefinition,
        { name: 'one.inheriting.deeply', stream: { ingest: {} } } as WiredStreamDefinition,
        { name: 'one.inheriting.deeply.nested', stream: { ingest: {} } } as WiredStreamDefinition,
        {
          name: 'one.override2',
          stream: { ingest: { lifecycle: { type: 'dlm', data_retention: '10d' } } },
        } as WiredStreamDefinition,
      ] as WiredStreamDefinition[];

      const inheritingStreams = findInheritingStreams(definition, descendants);

      expect(inheritingStreams).toEqual(
        expect.arrayContaining([
          'one',
          'one.inheriting',
          'one.inheriting.deeply',
          'one.inheriting.deeply.nested',
        ])
      );
    });

    it('handles leaf node', () => {
      const definition = {
        name: 'one',
        stream: {
          ingest: {
            lifecycle: { type: 'dlm', data_retention: '1d' },
          },
        },
      } as WiredStreamDefinition;
      const descendants = [] as WiredStreamDefinition[];

      const inheritingStreams = findInheritingStreams(definition, descendants);

      expect(inheritingStreams).toEqual(['one']);
    });
  });
});
