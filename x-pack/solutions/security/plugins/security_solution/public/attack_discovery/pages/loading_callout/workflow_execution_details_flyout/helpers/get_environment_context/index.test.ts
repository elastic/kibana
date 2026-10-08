/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEnvironmentContext } from '.';

describe('getEnvironmentContext', () => {
  describe('when all services are available', () => {
    it('returns the kibana version and space id', async () => {
      const spaces = {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'test-space' }),
      };

      const result = await getEnvironmentContext({
        kibanaVersion: '9.0.0',
        spaces,
      });

      expect(result).toEqual({
        kibanaVersion: '9.0.0',
        spaceId: 'test-space',
      });
    });
  });

  describe('when spaces is unavailable', () => {
    it('returns only the kibana version', async () => {
      const result = await getEnvironmentContext({
        kibanaVersion: '9.0.0',
        spaces: undefined,
      });

      expect(result).toEqual({
        kibanaVersion: '9.0.0',
        spaceId: undefined,
      });
    });
  });

  describe('when kibanaVersion is unavailable', () => {
    it('returns only the space id', async () => {
      const spaces = {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'test-space' }),
      };

      const result = await getEnvironmentContext({
        kibanaVersion: undefined,
        spaces,
      });

      expect(result).toEqual({
        kibanaVersion: undefined,
        spaceId: 'test-space',
      });
    });
  });

  describe('when no services are available', () => {
    it('returns empty context', async () => {
      const result = await getEnvironmentContext({});

      expect(result).toEqual({
        kibanaVersion: undefined,
        spaceId: undefined,
      });
    });
  });
});
