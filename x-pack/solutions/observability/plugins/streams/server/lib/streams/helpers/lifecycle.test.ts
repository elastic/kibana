/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WiredStreamDefinition } from '@kbn/streams-schema';
import { findInheritedLifecycle, findInheritingStreams } from './lifecycle';

describe('Lifecycle helpers', () => {
  describe('findInheritedLifecycle', () => {
    it('picks the definition lifecycle', () => {
      const definition = {
        name: 'one.two',
        ingest: { lifecycle: { type: 'dlm', data_retention: '1d' } },
      } as WiredStreamDefinition;
      const ascendants = [
        {
          name: 'one',
          ingest: { lifecycle: { type: 'ilm', policy: 'policy' } },
        } as WiredStreamDefinition,
      ] as WiredStreamDefinition[];

      const lifecycle = findInheritedLifecycle(definition, ascendants);

      expect(lifecycle).toEqual({
        from: 'one.two',
        type: 'dlm',
        data_retention: '1d',
      });
    });

    it('picks the nearest parent lifecycle', () => {
      const definition = {
        name: 'one.two.three.four',
        ingest: {},
      } as WiredStreamDefinition;
      const ascendants = [
        {
          name: 'one',
          ingest: { lifecycle: { type: 'ilm', policy: 'one' } },
        } as WiredStreamDefinition,
        {
          name: 'one.two.three',
          ingest: {},
        } as WiredStreamDefinition,
        {
          name: 'one.two',
          ingest: { lifecycle: { type: 'dlm', data_retention: '1d' } },
        } as WiredStreamDefinition,
      ] as WiredStreamDefinition[];

      const lifecycle = findInheritedLifecycle(definition, ascendants);

      expect(lifecycle).toEqual({
        from: 'one.two',
        type: 'dlm',
        data_retention: '1d',
      });
    });

    it('returns undefined if no lifecycle defined in the chain', () => {
      const definition = { name: 'one.two.three', ingest: {} } as WiredStreamDefinition;
      const ascendants = [
        { name: 'one.two', ingest: {} } as WiredStreamDefinition,
        { name: 'one', ingest: {} } as WiredStreamDefinition,
      ] as WiredStreamDefinition[];

      const lifecycle = findInheritedLifecycle(definition, ascendants);

      expect(lifecycle).toEqual(undefined);
    });
  });

  describe('findInheritingStreams', () => {
    it('returns all streams', () => {
      const definition = {
        name: 'one',
        ingest: {
          lifecycle: { type: 'dlm', data_retention: '1d' },
        },
      } as WiredStreamDefinition;
      const descendants = [
        { name: 'one.two.three', ingest: {} } as WiredStreamDefinition,
        { name: 'one.two2', ingest: {} } as WiredStreamDefinition,
        { name: 'one.two', ingest: {} } as WiredStreamDefinition,
        { name: 'one.two2.three', ingest: {} } as WiredStreamDefinition,
        { name: 'one.two2.three.four', ingest: {} } as WiredStreamDefinition,
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
        ingest: {
          lifecycle: { type: 'dlm', data_retention: '1d' },
        },
      } as WiredStreamDefinition;
      const descendants = [
        {
          name: 'one.override',
          ingest: { lifecycle: { type: 'ilm', policy: 'policy ' } },
        } as WiredStreamDefinition,
        { name: 'one.override.deeply', ingest: {} } as WiredStreamDefinition,
        { name: 'one.override.deeply.nested', ingest: {} } as WiredStreamDefinition,
        { name: 'one.inheriting', ingest: {} } as WiredStreamDefinition,
        { name: 'one.inheriting.deeply', ingest: {} } as WiredStreamDefinition,
        { name: 'one.inheriting.deeply.nested', ingest: {} } as WiredStreamDefinition,
        {
          name: 'one.override2',
          ingest: { lifecycle: { type: 'dlm', data_retention: '10d' } },
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
        ingest: {
          lifecycle: { type: 'dlm', data_retention: '1d' },
        },
      } as WiredStreamDefinition;
      const descendants = [] as WiredStreamDefinition[];

      const inheritingStreams = findInheritingStreams(definition, descendants);

      expect(inheritingStreams).toEqual(['one']);
    });
  });
});
