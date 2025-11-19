/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useHasGraphVisualizationAccess } from './use_has_graph_visualization_access';
import { useKibana } from '../lib/kibana';
import { useLicense } from './use_license';
import { BehaviorSubject } from 'rxjs';

jest.mock('../lib/kibana');
jest.mock('./use_license');

describe('useHasGraphVisualizationAccess', () => {
  const mockUseKibana = useKibana as jest.Mock;
  const mockUseLicense = useLicense as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ESS/Self-Managed Environment', () => {
    it('should return true when user has Enterprise license', () => {
      const productFeatureKeys$ = new BehaviorSubject<Set<string> | null>(null);

      mockUseKibana.mockReturnValue({
        services: {
          productFeatureKeys$,
          serverless: undefined,
        },
      });

      mockUseLicense.mockReturnValue({
        isEnterprise: jest.fn(() => true),
      });

      const { result } = renderHook(() => useHasGraphVisualizationAccess());

      expect(result.current).toBe(true);
    });

    it('should return false when user does not have Enterprise license', () => {
      const productFeatureKeys$ = new BehaviorSubject<Set<string> | null>(null);

      mockUseKibana.mockReturnValue({
        services: {
          productFeatureKeys$,
          serverless: undefined,
        },
      });

      mockUseLicense.mockReturnValue({
        isEnterprise: jest.fn(() => false),
      });

      const { result } = renderHook(() => useHasGraphVisualizationAccess());

      expect(result.current).toBe(false);
    });
  });

  describe('Serverless Environment', () => {
    it('should return true when user has Complete tier with graphVisualization feature', () => {
      const productFeatureKeys$ = new BehaviorSubject<Set<string> | null>(
        new Set<string>(['graph_visualization'])
      );

      mockUseKibana.mockReturnValue({
        services: {
          productFeatureKeys$,
          serverless: {
            projectType: 'security',
          },
        },
      });

      mockUseLicense.mockReturnValue({
        isEnterprise: jest.fn(() => false),
      });

      const { result } = renderHook(() => useHasGraphVisualizationAccess());

      expect(result.current).toBe(true);
    });

    it('should return false when user has Essentials tier without graphVisualization feature', () => {
      const productFeatureKeys$ = new BehaviorSubject<Set<string> | null>(new Set<string>([]));

      mockUseKibana.mockReturnValue({
        services: {
          productFeatureKeys$,
          serverless: {
            projectType: 'security',
          },
        },
      });

      mockUseLicense.mockReturnValue({
        isEnterprise: jest.fn(() => false),
      });

      const { result } = renderHook(() => useHasGraphVisualizationAccess());

      expect(result.current).toBe(false);
    });

    it('should return false when productFeatureKeys is null', () => {
      const productFeatureKeys$ = new BehaviorSubject<Set<string> | null>(null);

      mockUseKibana.mockReturnValue({
        services: {
          productFeatureKeys$,
          serverless: {
            projectType: 'security',
          },
        },
      });

      mockUseLicense.mockReturnValue({
        isEnterprise: jest.fn(() => true),
      });

      const { result } = renderHook(() => useHasGraphVisualizationAccess());

      expect(result.current).toBe(false);
    });

    it('should prioritize PLI check over license check in serverless mode', () => {
      const productFeatureKeys$ = new BehaviorSubject<Set<string> | null>(new Set<string>([]));

      mockUseKibana.mockReturnValue({
        services: {
          productFeatureKeys$,
          serverless: {
            projectType: 'security',
          },
        },
      });

      // Even though isEnterprise returns true, PLI check should take precedence
      const isEnterpriseMock = jest.fn(() => true);
      mockUseLicense.mockReturnValue({
        isEnterprise: isEnterpriseMock,
      });

      const { result } = renderHook(() => useHasGraphVisualizationAccess());

      // Should return false because graphVisualization is not in PLI
      expect(result.current).toBe(false);

      // isEnterprise should not be called in serverless mode
      expect(isEnterpriseMock).not.toHaveBeenCalled();
    });
  });
});
