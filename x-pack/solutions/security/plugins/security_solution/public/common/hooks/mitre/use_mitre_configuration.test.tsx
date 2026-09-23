/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useKibana } from '../../lib/kibana';
import { useMitreConfiguration } from './use_mitre_configuration';
import type { MitreEntitySummaryBuckets } from '@kbn/security-mitre-attack-common';
import { mockMitreEntitySummaryBuckets } from './use_mitre_configuration.mock';
import { LEGACY_FRAMEWORK_VERSION } from '../../../../common/detection_engine/mitre/mitre_data_adapter';

jest.mock('../../lib/kibana');

// ─── Managed-source hook (from mitre_attack plugin) ───────────────────────────
const mockUseFetchMitreEntitiesQuery = jest.fn();
jest.mock('@kbn/mitre-attack-plugin/public', () => ({
  useFetchMitreEntitiesQuery: (...args: unknown[]) => mockUseFetchMitreEntitiesQuery(...args),
  FETCH_MITRE_ENTITIES_QUERY_KEY: ['GET', '/internal/mitre/entities'],
}));

// ─── Legacy-source hook ────────────────────────────────────────────────────────
const mockUseFetchLegacyMitreQuery = jest.fn();
jest.mock('./use_fetch_bundled_mitre_query', () => ({
  useFetchLegacyMitreQuery: (...args: unknown[]) => mockUseFetchLegacyMitreQuery(...args),
  LEGACY_BUNDLED_MITRE_QUERY_KEY: (types?: string[]) => [
    'LAZY_BLOB',
    'mitre_tactics_techniques',
    types?.join(',') ?? null,
  ],
}));

const mockUseKibana = useKibana as jest.Mock;

const mockManagedData = {
  framework: 'enterprise' as const,
  framework_version: '16.1',
  ...mockMitreEntitySummaryBuckets(),
};

const mockLegacyData: MitreEntitySummaryBuckets = mockMitreEntitySummaryBuckets();

const setupKibanaMock = (isEnabled: boolean) => {
  mockUseKibana.mockReturnValue({
    services: {
      // http is passed straight through to useFetchMitreEntitiesQuery, which is mocked.
      http: {},
      mitreAttack: { isEnabled },
    },
  });
};

const makeQueryResult = (data: unknown, opts: { isLoading?: boolean; isError?: boolean } = {}) => ({
  data,
  isLoading: opts.isLoading ?? false,
  isError: opts.isError ?? false,
});

describe('useMitreConfiguration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    // Default: both hooks return idle/empty results
    mockUseFetchMitreEntitiesQuery.mockReturnValue(makeQueryResult(undefined));
    mockUseFetchLegacyMitreQuery.mockReturnValue(makeQueryResult(undefined));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when mitreAttack.isEnabled is false', () => {
    it('enables the legacy hook and disables the managed hook', () => {
      setupKibanaMock(false);
      mockUseFetchLegacyMitreQuery.mockReturnValue(makeQueryResult(mockLegacyData));

      renderHook(() => useMitreConfiguration());

      expect(mockUseFetchMitreEntitiesQuery).toHaveBeenCalledWith(
        expect.any(Object), // http
        expect.any(Object), // params
        expect.objectContaining({ enabled: false })
      );
      expect(mockUseFetchLegacyMitreQuery).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ enabled: true })
      );
    });

    it('returns legacy-sourced data with the normalized frameworkVersion', () => {
      setupKibanaMock(false);
      mockUseFetchLegacyMitreQuery.mockReturnValue(makeQueryResult(mockLegacyData));

      const { result } = renderHook(() => useMitreConfiguration());

      expect(result.current.tactics).toEqual(mockLegacyData.tactics);
      expect(result.current.techniques).toEqual(mockLegacyData.techniques);
      expect(result.current.subtechniques).toEqual(mockLegacyData.subtechniques);
      expect(result.current.frameworkVersion).toBe(LEGACY_FRAMEWORK_VERSION);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it('returns empty buckets and isLoading:true while the legacy hook is in flight', () => {
      setupKibanaMock(false);
      mockUseFetchLegacyMitreQuery.mockReturnValue(makeQueryResult(undefined, { isLoading: true }));

      const { result } = renderHook(() => useMitreConfiguration());

      expect(result.current.tactics).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isError).toBe(false);
    });
  });

  describe('when mitreAttack.isEnabled is true', () => {
    it('enables the managed hook and disables the legacy hook', () => {
      setupKibanaMock(true);
      mockUseFetchMitreEntitiesQuery.mockReturnValue(makeQueryResult(mockManagedData));

      renderHook(() => useMitreConfiguration());

      expect(mockUseFetchMitreEntitiesQuery).toHaveBeenCalledWith(
        expect.any(Object), // http
        expect.any(Object), // params
        expect.objectContaining({ enabled: true })
      );
      expect(mockUseFetchLegacyMitreQuery).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ enabled: false })
      );
    });

    it('returns managed data with frameworkVersion', () => {
      setupKibanaMock(true);
      mockUseFetchMitreEntitiesQuery.mockReturnValue(makeQueryResult(mockManagedData));

      const { result } = renderHook(() => useMitreConfiguration());

      expect(result.current.tactics).toEqual(mockManagedData.tactics);
      expect(result.current.techniques).toEqual(mockManagedData.techniques);
      expect(result.current.subtechniques).toEqual(mockManagedData.subtechniques);
      expect(result.current.frameworkVersion).toBe('16.1');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it('returns MitreEntitySummaryBuckets-shaped output from managed data', () => {
      setupKibanaMock(true);
      mockUseFetchMitreEntitiesQuery.mockReturnValue(makeQueryResult(mockManagedData));

      const { result } = renderHook(() => useMitreConfiguration());

      const tactic = result.current.tactics[0];
      expect(tactic).toHaveProperty('id');
      expect(tactic).toHaveProperty('name');
      expect(tactic).toHaveProperty('type', 'tactic');
      expect(tactic).toHaveProperty('framework', 'enterprise');
    });
  });

  describe('params', () => {
    it('forwards the full params object to the managed hook', () => {
      setupKibanaMock(true);
      mockUseFetchMitreEntitiesQuery.mockReturnValue(makeQueryResult(mockManagedData));

      renderHook(() => useMitreConfiguration({ types: ['tactic'] }));

      expect(mockUseFetchMitreEntitiesQuery).toHaveBeenCalledWith(
        expect.any(Object), // http
        expect.objectContaining({ types: ['tactic'] }),
        expect.any(Object)
      );
    });

    it('forwards only the types field to the legacy hook', () => {
      setupKibanaMock(false);
      mockUseFetchLegacyMitreQuery.mockReturnValue(makeQueryResult(mockLegacyData));

      renderHook(() => useMitreConfiguration({ types: ['tactic'] }));

      expect(mockUseFetchLegacyMitreQuery).toHaveBeenCalledWith(['tactic'], expect.any(Object));
    });
  });

  describe('loading state', () => {
    it('reflects isLoading:true while the managed fetch is in flight', () => {
      setupKibanaMock(true);
      mockUseFetchMitreEntitiesQuery.mockReturnValue(
        makeQueryResult(undefined, { isLoading: true })
      );

      const { result } = renderHook(() => useMitreConfiguration());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.tactics).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('surfaces isError:true and empty buckets when the managed fetch fails', () => {
      setupKibanaMock(true);
      mockUseFetchMitreEntitiesQuery.mockReturnValue(makeQueryResult(undefined, { isError: true }));

      const { result } = renderHook(() => useMitreConfiguration());

      expect(result.current.isError).toBe(true);
      expect(result.current.tactics).toEqual([]);
      expect(result.current.techniques).toEqual([]);
      expect(result.current.subtechniques).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('surfaces isError:true and empty buckets when the legacy fetch fails', () => {
      setupKibanaMock(false);
      mockUseFetchLegacyMitreQuery.mockReturnValue(makeQueryResult(undefined, { isError: true }));

      const { result } = renderHook(() => useMitreConfiguration());

      expect(result.current.isError).toBe(true);
      expect(result.current.tactics).toEqual([]);
    });
  });

  describe('empty managed response', () => {
    it('surfaces isError:true and empty buckets when managed returns no framework_version', () => {
      // framework_version is undefined when the index has no documents — population has
      // not run (e.g. ES was not ready at startup). This signal is independent of the
      // types filter and is the correct uninitialized indicator.
      setupKibanaMock(true);
      mockUseFetchMitreEntitiesQuery.mockReturnValue(
        makeQueryResult({ ...mockManagedData, framework_version: undefined })
      );

      const { result } = renderHook(() => useMitreConfiguration());

      expect(result.current.isError).toBe(true);
      expect(result.current.tactics).toEqual([]);
      expect(result.current.techniques).toEqual([]);
      expect(result.current.subtechniques).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('does not treat zero tactics as an error when framework_version is present', () => {
      // A types-filtered request (e.g. types: ['technique']) legitimately returns an empty
      // tactics bucket. Provided framework_version is set, this is a valid success response.
      setupKibanaMock(true);
      mockUseFetchMitreEntitiesQuery.mockReturnValue(
        makeQueryResult({ ...mockManagedData, tactics: [] })
      );

      const { result } = renderHook(() => useMitreConfiguration());

      expect(result.current.isError).toBe(false);
      // Techniques from the filtered response are passed through unchanged.
      expect(result.current.techniques).toEqual(mockManagedData.techniques);
    });

    it('does not treat missing framework_version as an error on the legacy path', () => {
      // The framework_version guard only applies to the managed path; the legacy blob is
      // always considered valid once loaded.
      setupKibanaMock(false);
      mockUseFetchLegacyMitreQuery.mockReturnValue(
        makeQueryResult({ ...mockLegacyData, tactics: [] })
      );

      const { result } = renderHook(() => useMitreConfiguration());

      expect(result.current.isError).toBe(false);
    });

    it('does not fire when managed returns a populated response with framework_version', () => {
      setupKibanaMock(true);
      mockUseFetchMitreEntitiesQuery.mockReturnValue(makeQueryResult(mockManagedData));

      const { result } = renderHook(() => useMitreConfiguration());

      expect(result.current.isError).toBe(false);
      expect(result.current.tactics).toEqual(mockManagedData.tactics);
    });
  });

  describe('when mitreAttack service is absent', () => {
    it('defaults to the legacy hook', () => {
      mockUseKibana.mockReturnValue({ services: { http: {} } });
      mockUseFetchLegacyMitreQuery.mockReturnValue(makeQueryResult(mockLegacyData));

      renderHook(() => useMitreConfiguration());

      expect(mockUseFetchMitreEntitiesQuery).toHaveBeenCalledWith(
        expect.any(Object), // http
        expect.any(Object), // params
        expect.objectContaining({ enabled: false })
      );
      expect(mockUseFetchLegacyMitreQuery).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ enabled: true })
      );
    });
  });

  describe('consistent shape from both sources', () => {
    it('exposes id, name, reference, type, framework on every entity regardless of flag', () => {
      const hasRequiredKeys = (obj: Record<string, unknown>) =>
        'id' in obj && 'name' in obj && 'reference' in obj && 'type' in obj && 'framework' in obj;

      // Flag off (legacy)
      setupKibanaMock(false);
      mockUseFetchLegacyMitreQuery.mockReturnValue(makeQueryResult(mockLegacyData));
      const { result: legacyResult } = renderHook(() => useMitreConfiguration());
      expect(hasRequiredKeys(legacyResult.current.tactics[0] as Record<string, unknown>)).toBe(
        true
      );

      // Flag on (managed)
      jest.clearAllMocks();
      setupKibanaMock(true);
      mockUseFetchMitreEntitiesQuery.mockReturnValue(makeQueryResult(mockManagedData));
      mockUseFetchLegacyMitreQuery.mockReturnValue(makeQueryResult(undefined));
      const { result: managedResult } = renderHook(() => useMitreConfiguration());
      expect(hasRequiredKeys(managedResult.current.tactics[0] as Record<string, unknown>)).toBe(
        true
      );
    });

    it('both paths expose a defined frameworkVersion string in the same format', () => {
      // Legacy path
      setupKibanaMock(false);
      mockUseFetchLegacyMitreQuery.mockReturnValue(makeQueryResult(mockLegacyData));
      const { result: legacyResult } = renderHook(() => useMitreConfiguration());
      expect(typeof legacyResult.current.frameworkVersion).toBe('string');
      // Normalized version should not start with 'v'
      expect(legacyResult.current.frameworkVersion).not.toMatch(/^v/);

      // Managed path
      jest.clearAllMocks();
      setupKibanaMock(true);
      mockUseFetchMitreEntitiesQuery.mockReturnValue(makeQueryResult(mockManagedData));
      mockUseFetchLegacyMitreQuery.mockReturnValue(makeQueryResult(undefined));
      const { result: managedResult } = renderHook(() => useMitreConfiguration());
      expect(typeof managedResult.current.frameworkVersion).toBe('string');
      expect(managedResult.current.frameworkVersion).not.toMatch(/^v/);
    });
  });
});
