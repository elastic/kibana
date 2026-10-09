/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import type {
  BriefJobStage,
  ExecutiveBriefJob,
} from '../../../../../../common/entity_analytics/executive_brief/types';
import { TEST_IDS } from '../../test_ids';
import { iconPulseStyles, labelGlowStyles } from './animation_styles';
import { BRIEF_LOADING_TEST_IDS, BriefLoading } from './brief_loading';
import { BRIEF_LOADING_STEPS, formatElapsed, getStepStates } from './steps';

const makeJob = (
  stage: BriefJobStage | undefined,
  overrides: Partial<ExecutiveBriefJob['params']> = {},
  startedAt = new Date().toISOString()
): ExecutiveBriefJob => ({
  id: 'job',
  spaceId: 'default',
  status: 'running',
  stage,
  createdAt: startedAt,
  updatedAt: startedAt,
  startedAt,
  createdBy: { username: 'elastic' },
  params: { timeRange: '7d', generator: 'inference', mode: 'standard', ...overrides } as never,
});

const stateOf = (id: string) =>
  screen.getByTestId(BRIEF_LOADING_TEST_IDS.step(id)).getAttribute('data-step-state');

describe('BriefLoading', () => {
  it.each([
    ['snapshot', ['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming']],
    ['storylines', ['complete', 'current', 'upcoming', 'upcoming', 'upcoming']],
    ['blind_spots', ['complete', 'complete', 'current', 'upcoming', 'upcoming']],
    ['generate', ['complete', 'complete', 'complete', 'current', 'upcoming']],
    ['validate', ['complete', 'complete', 'complete', 'complete', 'current']],
    ['persist', ['complete', 'complete', 'complete', 'complete', 'current']],
  ] as const)('maps stage %s to step states', (stage, expected) => {
    expect(getStepStates(stage)).toEqual(expected);
    render(<BriefLoading job={makeJob(stage)} />);
    expect(BRIEF_LOADING_STEPS.map(({ id }) => stateOf(id))).toEqual(expected);
  });

  it('has every step upcoming before a stage is reported, and keeps the progress test id', () => {
    render(<BriefLoading job={undefined} />);
    expect(screen.getByTestId(TEST_IDS.progress)).toBeInTheDocument();
    expect(BRIEF_LOADING_STEPS.map(({ id }) => stateOf(id))).toEqual(Array(5).fill('upcoming'));
    expect(screen.getByTestId(BRIEF_LOADING_TEST_IDS.stageLabel)).toHaveTextContent(
      'Starting the brief'
    );
  });

  it('labels the step list, marks the current step and announces the stage politely', () => {
    render(<BriefLoading job={makeJob('generate')} />);
    expect(screen.getByRole('list', { name: 'Brief generation progress' })).toBeInTheDocument();
    expect(screen.getByTestId(BRIEF_LOADING_TEST_IDS.step('write'))).toHaveAttribute(
      'aria-current',
      'step'
    );
    expect(screen.getByTestId(BRIEF_LOADING_TEST_IDS.stageLabel)).toHaveAttribute(
      'aria-live',
      'polite'
    );
  });

  it('formats elapsed time as m:ss', () => {
    expect(formatElapsed(12_000)).toBe('0:12');
    expect(formatElapsed(65_900)).toBe('1:05');
    expect(formatElapsed(-5)).toBe('0:00');
  });

  describe('timer', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('shows and updates the elapsed time with AI copy', () => {
      const startedAt = new Date(Date.now() - 12_000).toISOString();
      render(<BriefLoading job={makeJob('generate', {}, startedAt)} />);
      expect(screen.getByTestId(BRIEF_LOADING_TEST_IDS.timer)).toHaveTextContent(
        '0:12 · usually about 30 seconds'
      );
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(screen.getByTestId(BRIEF_LOADING_TEST_IDS.timer)).toHaveTextContent('0:15');
    });

    it('uses template copy for the template generator', () => {
      render(<BriefLoading job={makeJob('snapshot', { generator: 'template' })} />);
      expect(screen.getByTestId(BRIEF_LOADING_TEST_IDS.timer)).toHaveTextContent(
        'usually a few seconds'
      );
      expect(screen.getByTestId(BRIEF_LOADING_TEST_IDS.timer)).not.toHaveTextContent('30 seconds');
    });
  });

  it('only animates when the user has not asked for reduced motion', () => {
    [iconPulseStyles, labelGlowStyles].forEach(({ styles }) => {
      expect(styles).toContain('prefers-reduced-motion: no-preference');
      expect(styles).toContain('animation');
    });
  });
});
