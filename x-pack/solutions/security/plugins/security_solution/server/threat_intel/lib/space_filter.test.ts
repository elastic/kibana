/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import { GLOBAL_SPACE_ID } from '../../../common/threat_intel';
import {
  buildSpaceFilterTerms,
  canMutateSourceInSpace,
  resolveCurrentSpaceId,
} from './space_filter';

describe('space_filter', () => {
  describe('resolveCurrentSpaceId', () => {
    const request = {} as KibanaRequest;

    it('defaults to the default space only when the spaces plugin is absent', () => {
      expect(resolveCurrentSpaceId(undefined, request)).toBe('default');
    });

    it('delegates to the spaces service when installed', () => {
      const spaces = {
        getSpaceId: jest.fn().mockReturnValue('team-a'),
      } as unknown as SpacesServiceStart;
      expect(resolveCurrentSpaceId(spaces, request)).toBe('team-a');
    });

    it('fails closed: propagates errors from an installed spaces service', () => {
      const spaces = {
        getSpaceId: jest.fn(() => {
          throw new Error('boom');
        }),
      } as unknown as SpacesServiceStart;
      expect(() => resolveCurrentSpaceId(spaces, request)).toThrow('boom');
    });
  });

  describe('buildSpaceFilterTerms', () => {
    it('includes the current space and the global sentinel', () => {
      expect(buildSpaceFilterTerms('team-a')).toEqual({
        terms: { space_id: ['team-a', GLOBAL_SPACE_ID] },
      });
    });
  });

  describe('canMutateSourceInSpace', () => {
    it('allows mutation in the owning space', () => {
      expect(canMutateSourceInSpace('team-a', 'team-a')).toBe(true);
    });

    it('denies mutation from a different space', () => {
      expect(canMutateSourceInSpace('team-a', 'team-b')).toBe(false);
    });

    it('treats missing space_id as global', () => {
      expect(canMutateSourceInSpace(undefined, 'default')).toBe(true);
      expect(canMutateSourceInSpace(undefined, 'team-a')).toBe(false);
    });

    it('allows global catalog mutation only from default space', () => {
      expect(canMutateSourceInSpace(GLOBAL_SPACE_ID, 'default')).toBe(true);
      expect(canMutateSourceInSpace(GLOBAL_SPACE_ID, 'team-a')).toBe(false);
    });
  });
});
