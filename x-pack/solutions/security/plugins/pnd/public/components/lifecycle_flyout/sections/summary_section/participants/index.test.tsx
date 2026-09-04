/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { SYSTEM_SECURITY_WATCH_DEEP_ID, SYSTEM_SECURITY_WATCH_FLOOR_ID } from '@kbn/pnd-common';
import type { PndPhaseStepProjection } from '@kbn/pnd-common';

import { renderWithPndProviders } from '../../../../test_utils/render_with_pnd_providers';
import * as i18n from '../../../translations';
import { LifecycleParticipants } from '.';

const step = (phaseStepId: string, workflowId: string): PndPhaseStepProjection => ({
  phaseStepId,
  status: 'completed',
  workflowId,
});

describe('LifecycleParticipants', () => {
  it('renders the section', () => {
    renderWithPndProviders(<LifecycleParticipants steps={[]} />);

    expect(screen.getByTestId('pndLifecycleParticipants')).toBeInTheDocument();
  });

  it('titles the section', () => {
    renderWithPndProviders(<LifecycleParticipants steps={[]} />);

    expect(screen.getByTestId('pndLifecycleParticipants')).toHaveTextContent(
      i18n.OVERVIEW_PARTICIPANTS_LABEL
    );
  });

  it('says there are no participants when no watch ran a step', () => {
    renderWithPndProviders(<LifecycleParticipants steps={[]} />);

    expect(screen.getByTestId('pndLifecycleParticipantsEmpty')).toHaveTextContent(
      i18n.OVERVIEW_PARTICIPANTS_EMPTY
    );
  });

  it('says there are no participants when the only row names no watch', () => {
    renderWithPndProviders(<LifecycleParticipants steps={[step('step-1-2', '')]} />);

    expect(screen.getByTestId('pndLifecycleParticipantsEmpty')).toBeInTheDocument();
  });

  it('renders no badge when there are no participants', () => {
    renderWithPndProviders(<LifecycleParticipants steps={[]} />);

    expect(screen.queryAllByTestId(/^pndLifecycleParticipant-/)).toEqual([]);
  });

  it('renders a badge for the watch that ran the steps', () => {
    renderWithPndProviders(
      <LifecycleParticipants steps={[step('step-1-1', SYSTEM_SECURITY_WATCH_DEEP_ID)]} />
    );

    expect(
      screen.getByTestId(`pndLifecycleParticipant-${SYSTEM_SECURITY_WATCH_DEEP_ID}`)
    ).toHaveTextContent('Forensic Watch');
  });

  it('renders one badge per watch', () => {
    renderWithPndProviders(
      <LifecycleParticipants
        steps={[
          step('step-1-1', SYSTEM_SECURITY_WATCH_DEEP_ID),
          step('step-1-2', SYSTEM_SECURITY_WATCH_DEEP_ID),
          step('step-2-1', SYSTEM_SECURITY_WATCH_FLOOR_ID),
        ]}
      />
    );

    expect(screen.queryAllByTestId(/^pndLifecycleParticipant-/)).toHaveLength(2);
  });

  it('drops the empty state once there is a participant', () => {
    renderWithPndProviders(
      <LifecycleParticipants steps={[step('step-1-1', SYSTEM_SECURITY_WATCH_DEEP_ID)]} />
    );

    expect(screen.queryByTestId('pndLifecycleParticipantsEmpty')).not.toBeInTheDocument();
  });
});
