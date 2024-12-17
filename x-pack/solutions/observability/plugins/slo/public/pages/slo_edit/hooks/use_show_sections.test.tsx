/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useShowSections } from './use_show_sections';

describe('useShowSections', () => {
  describe('in edit mode', () => {
    it('shows both sections', () => {
      const { result } = renderHook(() => useShowSections(true, false, true, true));

      expect(result.current.showObjectiveSection).toBe(true);
      expect(result.current.showDescriptionSection).toBe(true);
    });
  });

  describe('in create mode', () => {
    it('shows no sections when indicator section is invalid', () => {
      const { result } = renderHook(() => useShowSections(false, false, false, false));

      expect(result.current.showObjectiveSection).toBe(false);
      expect(result.current.showDescriptionSection).toBe(false);
    });

    it('shows the objective section when the indicator section is valid', () => {
      const { result } = renderHook(() => useShowSections(false, false, true, false));

      expect(result.current.showObjectiveSection).toBe(true);
      expect(result.current.showDescriptionSection).toBe(false);
    });

    it('shows the description section when the indicator section and objective is valid', () => {
      const { result } = renderHook(() => useShowSections(false, false, true, true));

      expect(result.current.showObjectiveSection).toBe(true);
      expect(result.current.showDescriptionSection).toBe(true);
    });
  });
});
