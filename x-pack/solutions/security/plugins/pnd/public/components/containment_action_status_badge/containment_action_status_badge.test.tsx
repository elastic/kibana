/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import {
  CONTAINMENT_ACTION_STATUS_PRESENTATION,
  ContainmentActionStatusBadge,
  PND_CONTAINMENT_ACTION_STATUSES,
  getContainmentActionStatusPresentation,
} from './containment_action_status_badge';

describe('ContainmentActionStatusBadge', () => {
  it('renders one badge per status', () => {
    PND_CONTAINMENT_ACTION_STATUSES.forEach((status) => {
      const { unmount } = renderWithPndProviders(<ContainmentActionStatusBadge status={status} />);

      expect(screen.getByTestId('pndContainmentActionStatusBadge')).toHaveAttribute(
        'data-status',
        status
      );
      unmount();
    });
  });

  it('renders the status label as the badge text', () => {
    renderWithPndProviders(<ContainmentActionStatusBadge status="succeeded" />);

    expect(screen.getByTestId('pndContainmentActionStatusBadge')).toHaveTextContent(
      CONTAINMENT_ACTION_STATUS_PRESENTATION.succeeded.label
    );
  });

  it('gives every status a distinct label', () => {
    const labels = PND_CONTAINMENT_ACTION_STATUSES.map(
      (status) => CONTAINMENT_ACTION_STATUS_PRESENTATION[status].label
    );

    expect(new Set(labels).size).toBe(PND_CONTAINMENT_ACTION_STATUSES.length);
  });

  it('gives every status a distinct visual treatment (color + icon)', () => {
    const treatments = PND_CONTAINMENT_ACTION_STATUSES.map((status) => {
      const { color, iconType } = CONTAINMENT_ACTION_STATUS_PRESENTATION[status];
      return `${color}:${iconType}`;
    });

    expect(new Set(treatments).size).toBe(PND_CONTAINMENT_ACTION_STATUSES.length);
  });

  // `submitted` deliberately shares the success tone: the hand-off is the outcome PND can vouch
  // for. Everything else keeps its own tone — a `not_executed` action must never read as success.
  it('reserves the success color for succeeded and submitted alone', () => {
    const successStatuses = PND_CONTAINMENT_ACTION_STATUSES.filter(
      (status) => CONTAINMENT_ACTION_STATUS_PRESENTATION[status].color === 'success'
    );

    expect(successStatuses).toEqual(['submitted', 'succeeded']);
  });

  it('renders failed with the danger tone', () => {
    expect(CONTAINMENT_ACTION_STATUS_PRESENTATION.failed.color).toBe('danger');
  });

  it('renders skipped with the warning tone', () => {
    expect(CONTAINMENT_ACTION_STATUS_PRESENTATION.skipped.color).toBe('warning');
  });

  it('renders not_executed with the neutral default tone', () => {
    expect(CONTAINMENT_ACTION_STATUS_PRESENTATION.not_executed.color).toBe('default');
  });

  describe('getContainmentActionStatusPresentation', () => {
    it('returns the presentation for a known status', () => {
      expect(getContainmentActionStatusPresentation('failed')).toEqual(
        CONTAINMENT_ACTION_STATUS_PRESENTATION.failed
      );
    });

    it('falls back to an explicit unknown treatment for a status it does not know', () => {
      expect(getContainmentActionStatusPresentation('invented_status').label).toMatch(/unknown/i);
    });

    it('never renders an unknown status as success', () => {
      expect(getContainmentActionStatusPresentation('invented_status').color).not.toBe('success');
    });

    it('surfaces the raw value of an unknown status, so it is debuggable', () => {
      expect(getContainmentActionStatusPresentation('invented_status').description).toContain(
        'invented_status'
      );
    });
  });

  it('renders an unknown status without crashing', () => {
    renderWithPndProviders(<ContainmentActionStatusBadge status="invented_status" />);

    expect(screen.getByTestId('pndContainmentActionStatusBadge')).toBeInTheDocument();
  });
});
