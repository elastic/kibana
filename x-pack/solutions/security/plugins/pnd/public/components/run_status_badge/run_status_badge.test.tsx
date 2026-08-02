/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { PndRunStatus } from '@kbn/pnd-common';
import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import {
  PND_RUN_STATUSES,
  RUN_STATUS_PRESENTATION,
  RunStatusBadge,
  getRunStatusPresentation,
} from './run_status_badge';
import type { PndRunStatusName } from './run_status_badge';

describe('RunStatusBadge', () => {
  it('covers the six PndRunStatus members', () => {
    expect(PND_RUN_STATUSES).toHaveLength(6);
  });

  it('covers every member of the generated PndRunStatus contract', () => {
    const generated = Object.values(PndRunStatus.enum) as PndRunStatusName[];

    generated.forEach((status) => {
      expect(PND_RUN_STATUSES).toContain(status);
    });
  });

  it('renders one badge per status', () => {
    PND_RUN_STATUSES.forEach((status) => {
      const { unmount } = renderWithPndProviders(<RunStatusBadge status={status} />);

      expect(screen.getByTestId('pndRunStatusBadge')).toHaveAttribute('data-status', status);
      unmount();
    });
  });

  it('renders the status label as the badge text', () => {
    renderWithPndProviders(<RunStatusBadge status="succeeded" />);

    expect(screen.getByTestId('pndRunStatusBadge')).toHaveTextContent(
      RUN_STATUS_PRESENTATION.succeeded.label
    );
  });

  it('gives every status a distinct label', () => {
    const labels = PND_RUN_STATUSES.map((status) => RUN_STATUS_PRESENTATION[status].label);

    expect(new Set(labels).size).toBe(PND_RUN_STATUSES.length);
  });

  it('gives every status a distinct visual treatment (color + icon)', () => {
    const treatments = PND_RUN_STATUSES.map((status) => {
      const { color, iconType } = RUN_STATUS_PRESENTATION[status];
      return `${color}:${iconType}`;
    });

    expect(new Set(treatments).size).toBe(PND_RUN_STATUSES.length);
  });

  it('reserves the success color for succeeded alone', () => {
    const successStatuses = PND_RUN_STATUSES.filter(
      (status) => RUN_STATUS_PRESENTATION[status].color === 'success'
    );

    expect(successStatuses).toEqual(['succeeded']);
  });

  it('distinguishes timed_out from failed', () => {
    expect(RUN_STATUS_PRESENTATION.timed_out.label).not.toBe(RUN_STATUS_PRESENTATION.failed.label);
  });

  it('shows waiting_for_input as the one status an analyst can act on', () => {
    expect(RUN_STATUS_PRESENTATION.waiting_for_input.color).toBe('warning');
  });

  describe('getRunStatusPresentation', () => {
    it('returns the presentation for a known status', () => {
      expect(getRunStatusPresentation('running')).toEqual(RUN_STATUS_PRESENTATION.running);
    });

    it('falls back to an explicit unknown treatment for a status it does not know', () => {
      // Cast: the fallback exists for a server that adds a status before the UI does.
      const presentation = getRunStatusPresentation('invented_status' as PndRunStatusName);

      expect(presentation.label).toMatch(/unknown/i);
    });

    it('never renders an unknown status as success', () => {
      const presentation = getRunStatusPresentation('invented_status' as PndRunStatusName);

      expect(presentation.color).not.toBe('success');
    });
  });

  it('renders an unknown status without crashing', () => {
    renderWithPndProviders(<RunStatusBadge status={'invented_status' as PndRunStatusName} />);

    expect(screen.getByTestId('pndRunStatusBadge')).toBeInTheDocument();
  });
});
