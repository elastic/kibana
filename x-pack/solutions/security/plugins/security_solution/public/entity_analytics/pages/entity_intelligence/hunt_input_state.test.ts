/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveHuntInputState } from './hunt_input_state';

describe('deriveHuntInputState', () => {
  describe('idle (no hunt started)', () => {
    it('expands the composer and shows templates', () => {
      const state = deriveHuntInputState({
        transcriptLength: 0,
        isGenerating: false,
        isComposerManuallyOpen: false,
      });

      expect(state).toEqual({
        lifecycle: 'idle',
        isComposerExpanded: true,
        showNewHuntPill: false,
        showTemplates: true,
      });
    });

    it('stays expanded even if the manual-open flag is set', () => {
      const state = deriveHuntInputState({
        transcriptLength: 0,
        isGenerating: false,
        isComposerManuallyOpen: true,
      });

      expect(state.isComposerExpanded).toBe(true);
      expect(state.showTemplates).toBe(true);
    });
  });

  describe('active while generating', () => {
    it('collapses the composer and hides the pill so the canvas owns the space', () => {
      const state = deriveHuntInputState({
        transcriptLength: 1,
        isGenerating: true,
        isComposerManuallyOpen: false,
      });

      expect(state.lifecycle).toBe('active');
      expect(state.isComposerExpanded).toBe(false);
      expect(state.showNewHuntPill).toBe(false);
      expect(state.showTemplates).toBe(false);
    });

    it('keeps the composer collapsed even if manually opened while streaming', () => {
      const state = deriveHuntInputState({
        transcriptLength: 2,
        isGenerating: true,
        isComposerManuallyOpen: true,
      });

      expect(state.isComposerExpanded).toBe(false);
      expect(state.showNewHuntPill).toBe(false);
    });
  });

  describe('active and complete', () => {
    it('collapses the composer and offers the New hunt pill by default', () => {
      const state = deriveHuntInputState({
        transcriptLength: 2,
        isGenerating: false,
        isComposerManuallyOpen: false,
      });

      expect(state.lifecycle).toBe('active');
      expect(state.isComposerExpanded).toBe(false);
      expect(state.showNewHuntPill).toBe(true);
      expect(state.showTemplates).toBe(false);
    });

    it('re-expands the composer and hides the pill once the analyst opts in', () => {
      const state = deriveHuntInputState({
        transcriptLength: 2,
        isGenerating: false,
        isComposerManuallyOpen: true,
      });

      expect(state.isComposerExpanded).toBe(true);
      expect(state.showNewHuntPill).toBe(false);
      // Templates never return once a hunt is on screen.
      expect(state.showTemplates).toBe(false);
    });
  });
});
