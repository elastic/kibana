/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { PndPhaseStepStatus } from '@kbn/pnd-common';
import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import {
  PHASE_STEP_STATUS_PRESENTATION,
  PND_PHASE_STEP_STATUSES,
  PhaseStepStatusBadge,
  getPhaseStepStatusPresentation,
} from './phase_step_status_badge';
import type { PndPhaseStepStatusName } from './phase_step_status_badge';

describe('PhaseStepStatusBadge', () => {
  it('renders one badge per status', () => {
    PND_PHASE_STEP_STATUSES.forEach((status) => {
      const { unmount } = renderWithPndProviders(<PhaseStepStatusBadge status={status} />);

      expect(screen.getByTestId('pndPhaseStepStatusBadge')).toHaveAttribute('data-status', status);
      unmount();
    });
  });

  it('renders the status label as the badge text', () => {
    renderWithPndProviders(<PhaseStepStatusBadge status="completed" />);

    expect(screen.getByTestId('pndPhaseStepStatusBadge')).toHaveTextContent(
      PHASE_STEP_STATUS_PRESENTATION.completed.label
    );
  });

  it('gives every status a distinct label', () => {
    const labels = PND_PHASE_STEP_STATUSES.map(
      (status) => PHASE_STEP_STATUS_PRESENTATION[status].label
    );

    expect(new Set(labels).size).toBe(PND_PHASE_STEP_STATUSES.length);
  });

  it('gives every status a distinct visual treatment (color + icon)', () => {
    const treatments = PND_PHASE_STEP_STATUSES.map((status) => {
      const { color, iconType } = PHASE_STEP_STATUS_PRESENTATION[status];
      return `${color}:${iconType}`;
    });

    expect(new Set(treatments).size).toBe(PND_PHASE_STEP_STATUSES.length);
  });

  it('gives every status a distinct description', () => {
    const descriptions = PND_PHASE_STEP_STATUSES.map(
      (status) => PHASE_STEP_STATUS_PRESENTATION[status].description
    );

    expect(new Set(descriptions).size).toBe(PND_PHASE_STEP_STATUSES.length);
  });

  // kibana-phf4.12 replaced `stubbed` with `upstream`: the two surviving non-live rows are work
  // Attack Discovery really performs, so the copy has to name who does it rather than claim nothing
  // was built. It still may not read as success, and it still may not read as pending.
  describe('upstream reads as done elsewhere, never as success and never as pending', () => {
    it('never uses the success color', () => {
      expect(PHASE_STEP_STATUS_PRESENTATION.upstream.color).not.toBe('success');
    });

    it('does not use the word "complete" in its label', () => {
      expect(PHASE_STEP_STATUS_PRESENTATION.upstream.label).not.toMatch(/complete/i);
    });

    it('does not read as pending, which would suggest PND is about to run it', () => {
      expect(PHASE_STEP_STATUS_PRESENTATION.upstream.label).not.toMatch(/not started|pending/i);
    });

    it('names Attack Discovery in its description, because that is who does the work', () => {
      expect(PHASE_STEP_STATUS_PRESENTATION.upstream.description).toMatch(/attack discovery/i);
    });

    it('says PND records no step of its own for it', () => {
      expect(PHASE_STEP_STATUS_PRESENTATION.upstream.description).toMatch(/no step/i);
    });

    it('is visually distinct from skipped', () => {
      const upstream = PHASE_STEP_STATUS_PRESENTATION.upstream;
      const skipped = PHASE_STEP_STATUS_PRESENTATION.skipped;

      expect(`${upstream.color}:${upstream.iconType}`).not.toBe(
        `${skipped.color}:${skipped.iconType}`
      );
    });
  });

  it('reserves the success color for completed alone', () => {
    const successStatuses = PND_PHASE_STEP_STATUSES.filter(
      (status) => PHASE_STEP_STATUS_PRESENTATION[status].color === 'success'
    );

    expect(successStatuses).toEqual(['completed']);
  });

  it('covers every member of the generated PndPhaseStepStatus contract', () => {
    const generated = Object.values(PndPhaseStepStatus.enum) as PndPhaseStepStatusName[];

    generated.forEach((status) => {
      expect(PND_PHASE_STEP_STATUSES).toContain(status);
    });
  });

  describe('getPhaseStepStatusPresentation', () => {
    it('returns the presentation for a known status', () => {
      expect(getPhaseStepStatusPresentation('running')).toEqual(
        PHASE_STEP_STATUS_PRESENTATION.running
      );
    });

    it('falls back to an explicit unknown treatment for a status it does not know', () => {
      // Cast: the fallback exists for a server that adds a status before the UI does.
      const presentation = getPhaseStepStatusPresentation(
        'invented_status' as PndPhaseStepStatusName
      );

      expect(presentation.label).toMatch(/unknown/i);
    });

    it('never renders an unknown status as success', () => {
      const presentation = getPhaseStepStatusPresentation(
        'invented_status' as PndPhaseStepStatusName
      );

      expect(presentation.color).not.toBe('success');
    });

    it('surfaces the raw value of an unknown status, so it is debuggable', () => {
      const presentation = getPhaseStepStatusPresentation(
        'invented_status' as PndPhaseStepStatusName
      );

      expect(presentation.description).toContain('invented_status');
    });
  });

  it('renders an unknown status without crashing', () => {
    renderWithPndProviders(
      <PhaseStepStatusBadge status={'invented_status' as PndPhaseStepStatusName} />
    );

    expect(screen.getByTestId('pndPhaseStepStatusBadge')).toBeInTheDocument();
  });
});
