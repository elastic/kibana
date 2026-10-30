/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { MITRE_FRAMEWORKS } from '@kbn/security-mitre-attack-common';
import { useKibana } from '../../lib/kibana';
import { useAvailableMitreFrameworks } from './use_available_mitre_frameworks';

jest.mock('../../lib/kibana');

const mockUseKibana = useKibana as jest.Mock;

describe('useAvailableMitreFrameworks', () => {
  it('returns every framework when the managed source is enabled', () => {
    mockUseKibana.mockReturnValue({ services: { mitreAttack: { isEnabled: true } } });

    const { result } = renderHook(() => useAvailableMitreFrameworks());

    expect(result.current).toEqual(MITRE_FRAMEWORKS);
  });

  it('returns only enterprise when the managed source is disabled', () => {
    mockUseKibana.mockReturnValue({ services: { mitreAttack: { isEnabled: false } } });

    const { result } = renderHook(() => useAvailableMitreFrameworks());

    expect(result.current).toEqual(['enterprise']);
  });

  it('returns only enterprise when the mitreAttack service is missing', () => {
    mockUseKibana.mockReturnValue({ services: {} });

    const { result } = renderHook(() => useAvailableMitreFrameworks());

    expect(result.current).toEqual(['enterprise']);
  });

  it('returns a stable reference across renders', () => {
    mockUseKibana.mockReturnValue({ services: { mitreAttack: { isEnabled: false } } });

    const { result, rerender } = renderHook(() => useAvailableMitreFrameworks());
    const first = result.current;
    rerender();

    expect(result.current).toBe(first);
  });
});
