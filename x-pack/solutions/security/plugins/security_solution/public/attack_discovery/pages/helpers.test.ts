/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultQuery, showEmptyPrompt, showNoAlertsPrompt, showWelcomePrompt } from './helpers';

describe('helpers', () => {
  describe('showNoAlertsPrompt', () => {
    it('returns true when isLoading is false and alertsContextCount is 0', () => {
      const result = showNoAlertsPrompt({
        alertsContextCount: 0,
        connectorId: 'test',
        isLoading: false,
      });

      expect(result).toBe(true);
    });

    it('returns false when isLoading is true', () => {
      const result = showNoAlertsPrompt({
        alertsContextCount: 0,
        connectorId: 'test',
        isLoading: true,
      });

      expect(result).toBe(false);
    });

    it('returns false when alertsContextCount is null', () => {
      const result = showNoAlertsPrompt({
        alertsContextCount: null,
        connectorId: 'test',
        isLoading: false,
      });

      expect(result).toBe(false);
    });

    it('returns false when alertsContextCount greater than 0', () => {
      const result = showNoAlertsPrompt({
        alertsContextCount: 20,
        connectorId: 'test',
        isLoading: false,
      });

      expect(result).toBe(false);
    });
  });

  describe('showWelcomePrompt', () => {
    it('returns true when isLoading is false and aiConnectorsCount is 0', () => {
      const result = showWelcomePrompt({
        aiConnectorsCount: 0,
        isLoading: false,
      });

      expect(result).toBe(true);
    });

    it('returns false when isLoading is true', () => {
      const result = showWelcomePrompt({
        aiConnectorsCount: 0,
        isLoading: true,
      });

      expect(result).toBe(false);
    });

    it('returns false when aiConnectorsCount is null', () => {
      const result = showWelcomePrompt({
        aiConnectorsCount: null,
        isLoading: false,
      });

      expect(result).toBe(false);
    });

    it('returns false when aiConnectorsCount is greater than 0', () => {
      const result = showWelcomePrompt({
        aiConnectorsCount: 5,
        isLoading: false,
      });

      expect(result).toBe(false);
    });
  });

  describe('showEmptyPrompt', () => {
    it('returns true when isLoading is false and attackDiscoveriesCount is 0', () => {
      const result = showEmptyPrompt({
        aiConnectorsCount: 1,
        attackDiscoveriesCount: 0,
        isLoading: false,
      });

      expect(result).toBe(true);
    });

    it('returns false when isLoading is false and attackDiscoveriesCount is 0 and aiConnectorsCount is null', () => {
      const result = showEmptyPrompt({
        aiConnectorsCount: null,
        attackDiscoveriesCount: 0,
        isLoading: false,
      });

      expect(result).toBe(false);
    });

    it('returns false when isLoading is true', () => {
      const result = showEmptyPrompt({
        aiConnectorsCount: 1,
        attackDiscoveriesCount: 0,
        isLoading: true,
      });

      expect(result).toBe(false);
    });

    it('returns false when isLoading is true and aiConnectorsCount is null', () => {
      const result = showEmptyPrompt({
        aiConnectorsCount: null,
        attackDiscoveriesCount: 0,
        isLoading: true,
      });

      expect(result).toBe(false);
    });

    it('returns false when attackDiscoveriesCount is greater than 0', () => {
      const result = showEmptyPrompt({
        aiConnectorsCount: 1,
        attackDiscoveriesCount: 4,
        isLoading: false,
      });

      expect(result).toBe(false);
    });

    it('returns false when attackDiscoveriesCount is greater than 0 and aiConnectorsCount is null', () => {
      const result = showEmptyPrompt({
        aiConnectorsCount: null,
        attackDiscoveriesCount: 4,
        isLoading: false,
      });

      expect(result).toBe(false);
    });
  });

  describe('getDefaultQuery', () => {
    it('returns the expected default', () => {
      const result = getDefaultQuery();

      expect(result).toEqual({ language: 'kuery', query: '' });
    });
  });
});
