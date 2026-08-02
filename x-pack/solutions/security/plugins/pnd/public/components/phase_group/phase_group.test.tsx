/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { PHASE_IDS } from '@kbn/pnd-common';
import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import { PHASE_LABELS, PhaseGroup } from './phase_group';

describe('PhaseGroup', () => {
  it('renders a label for every phase', () => {
    PHASE_IDS.forEach((phase) => {
      expect(PHASE_LABELS[phase]).toBeTruthy();
    });
  });

  it('gives every phase a distinct label', () => {
    const labels = PHASE_IDS.map((phase) => PHASE_LABELS[phase]);

    expect(new Set(labels).size).toBe(PHASE_IDS.length);
  });

  it('numbers the phases 1 through 4 in the label, so a row number like 2.7 is locatable', () => {
    PHASE_IDS.forEach((phase, index) => {
      expect(PHASE_LABELS[phase]).toContain(`${index + 1}`);
    });
  });

  it('renders the phase label', () => {
    renderWithPndProviders(
      <PhaseGroup count={5} phase="signal_triage">
        <div>{'rows'}</div>
      </PhaseGroup>
    );

    expect(screen.getByText(PHASE_LABELS.signal_triage)).toBeInTheDocument();
  });

  it('renders the phase on the group, so a test can target one phase', () => {
    renderWithPndProviders(
      <PhaseGroup count={5} phase="investigation">
        <div>{'rows'}</div>
      </PhaseGroup>
    );

    expect(screen.getByTestId('pndPhaseGroup')).toHaveAttribute('data-phase', 'investigation');
  });

  it('renders the header count', () => {
    renderWithPndProviders(
      <PhaseGroup count={8} phase="investigation">
        <div>{'rows'}</div>
      </PhaseGroup>
    );

    expect(screen.getByTestId('pndPhaseGroupCount')).toHaveTextContent('8');
  });

  it('renders a singular count without an "s"', () => {
    renderWithPndProviders(
      <PhaseGroup count={1} phase="investigation">
        <div>{'rows'}</div>
      </PhaseGroup>
    );

    expect(screen.getByTestId('pndPhaseGroupCount')).toHaveTextContent('1 step');
  });

  it('renders a plural count', () => {
    renderWithPndProviders(
      <PhaseGroup count={8} phase="investigation">
        <div>{'rows'}</div>
      </PhaseGroup>
    );

    expect(screen.getByTestId('pndPhaseGroupCount')).toHaveTextContent('8 steps');
  });

  it('renders a zero count rather than hiding it', () => {
    renderWithPndProviders(
      <PhaseGroup count={0} phase="post_incident">
        <div>{'rows'}</div>
      </PhaseGroup>
    );

    expect(screen.getByTestId('pndPhaseGroupCount')).toHaveTextContent('0 steps');
  });

  it('renders its children', () => {
    renderWithPndProviders(
      <PhaseGroup count={1} phase="post_incident">
        <div data-test-subj="pndTestRow">{'a row'}</div>
      </PhaseGroup>
    );

    expect(screen.getByTestId('pndTestRow')).toBeInTheDocument();
  });

  it('is expanded by default', () => {
    renderWithPndProviders(
      <PhaseGroup count={1} phase="post_incident">
        <div>{'rows'}</div>
      </PhaseGroup>
    );

    expect(screen.getByRole('button', { expanded: true })).toBeInTheDocument();
  });

  it('honors initialIsOpen={false}', () => {
    renderWithPndProviders(
      <PhaseGroup count={1} initialIsOpen={false} phase="post_incident">
        <div>{'rows'}</div>
      </PhaseGroup>
    );

    expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument();
  });

  it('collapses when the header is clicked', () => {
    renderWithPndProviders(
      <PhaseGroup count={1} phase="post_incident">
        <div>{'rows'}</div>
      </PhaseGroup>
    );

    fireEvent.click(screen.getByRole('button', { expanded: true }));

    expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument();
  });

  it('gives each phase a distinct accordion id, so two groups can be open at once', () => {
    const { unmount } = renderWithPndProviders(
      <PhaseGroup count={1} phase="signal_triage">
        <div>{'rows'}</div>
      </PhaseGroup>
    );
    const first = screen
      .getByTestId('pndPhaseGroup')
      .querySelector('button')
      ?.getAttribute('aria-controls');
    unmount();

    renderWithPndProviders(
      <PhaseGroup count={1} phase="investigation">
        <div>{'rows'}</div>
      </PhaseGroup>
    );
    const second = screen
      .getByTestId('pndPhaseGroup')
      .querySelector('button')
      ?.getAttribute('aria-controls');

    expect(first).not.toBe(second);
  });
});
