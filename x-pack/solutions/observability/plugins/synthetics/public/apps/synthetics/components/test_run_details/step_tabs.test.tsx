/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../utils/testing';
import type { JourneyStep } from '../../../../../common/runtime_types';
import { StepTabs } from './step_tabs';

describe('<StepTabs />', () => {
  const createStep = (
    index: number,
    status: 'succeeded' | 'failed' = 'succeeded'
  ): JourneyStep => ({
    _id: `step-${index}`,
    '@timestamp': '2023-07-31T16:48:00.729Z',
    synthetics: {
      package_version: '1.0.0',
      journey: { name: 'test-journey', id: 'test-journey' },
      payload: { source: `() => console.log('Step ${index} code')` },
      step: {
        duration: { us: 1000000 },
        name: `Step ${index}`,
        index,
        status,
      },
      type: 'step/end',
    },
    monitor: {
      name: 'Test Monitor',
      id: 'test-monitor-id',
      check_group: 'test-check-group',
      type: 'browser',
    },
    config_id: 'test-config-id',
  });

  const createConsoleStep = (stepIndex: number, text: string): JourneyStep => ({
    _id: `console-${stepIndex}-${text}`,
    '@timestamp': '2023-07-31T16:48:00.729Z',
    synthetics: {
      package_version: '1.0.0',
      journey: { name: 'test-journey', id: 'test-journey' },
      payload: { text },
      step: {
        index: stepIndex,
        name: `Step ${stepIndex}`,
        status: 'succeeded',
        duration: { us: 0 },
      },
      type: 'journey/browserconsole',
    },
    monitor: {
      name: 'Test Monitor',
      id: 'test-monitor-id',
      check_group: 'test-check-group',
      type: 'browser',
    },
    config_id: 'test-config-id',
  });

  it('renders code tab by default', () => {
    const step = createStep(1);
    const { getByText } = render(<StepTabs stepsList={[step]} step={step} loading={false} />);

    expect(getByText('Code executed')).toBeInTheDocument();
    expect(getByText('Console')).toBeInTheDocument();
  });

  it('displays console output for the current step index', async () => {
    const step1 = createStep(1);
    const step2 = createStep(2);
    const console1 = createConsoleStep(1, 'Console output from step 1');
    const console2 = createConsoleStep(2, 'Console output from step 2');

    const stepsList = [step1, step2, console1, console2];

    // Render with step 2 as the current step
    const { getByText, getByRole } = render(
      <StepTabs stepsList={stepsList} step={step2} loading={false} />
    );

    // Click on Console tab
    const consoleTab = getByText('Console');
    fireEvent.click(consoleTab);

    await waitFor(() => {
      // Should show step 2's console output, NOT step 1's
      const codeBlock = getByRole('code');
      expect(codeBlock.textContent).toContain('Console output from step 2');
      expect(codeBlock.textContent).not.toContain('Console output from step 1');
    });
  });

  it('displays console output for step 1 when viewing step 1', async () => {
    const step1 = createStep(1);
    const step2 = createStep(2);
    const console1 = createConsoleStep(1, 'Console output from step 1');
    const console2 = createConsoleStep(2, 'Console output from step 2');

    const stepsList = [step1, step2, console1, console2];

    // Render with step 1 as the current step
    const { getByText, getByRole } = render(
      <StepTabs stepsList={stepsList} step={step1} loading={false} />
    );

    // Click on Console tab
    const consoleTab = getByText('Console');
    fireEvent.click(consoleTab);

    await waitFor(() => {
      // Should show step 1's console output
      const codeBlock = getByRole('code');
      expect(codeBlock.textContent).toContain('Console output from step 1');
      expect(codeBlock.textContent).not.toContain('Console output from step 2');
    });
  });

  it('handles step with no console output', async () => {
    const step1 = createStep(1);
    const step2 = createStep(2);
    const console1 = createConsoleStep(1, 'Console output from step 1');

    // Step 2 has no console output
    const stepsList = [step1, step2, console1];

    const { getByText, getByRole } = render(
      <StepTabs stepsList={stepsList} step={step2} loading={false} />
    );

    // Click on Console tab
    const consoleTab = getByText('Console');
    fireEvent.click(consoleTab);

    await waitFor(() => {
      // Should show empty console (no step 1 output shown)
      const codeBlock = getByRole('code');
      expect(codeBlock.textContent).not.toContain('Console output from step 1');
    });
  });

  it('shows stackTrace tab first for failed steps', () => {
    const failedStep = createStep(1, 'failed');
    failedStep.synthetics!.error = {
      name: 'Error',
      message: 'Test error',
      stack: 'Error: Test error\n    at test.js:1',
    };

    const { getByText } = render(
      <StepTabs stepsList={[failedStep]} step={failedStep} loading={false} />
    );

    expect(getByText('Stacktrace')).toBeInTheDocument();
  });

  it('returns null when stepsList is empty and not loading', () => {
    const { container } = render(<StepTabs stepsList={[]} step={undefined} loading={false} />);

    expect(container.firstChild).toBeNull();
  });

  it('shows loading skeleton when loading', () => {
    const { container } = render(<StepTabs stepsList={[]} step={undefined} loading={true} />);

    // EuiSkeletonText renders spans with specific classes
    expect(container.querySelector('.euiSkeletonText')).toBeInTheDocument();
  });
});
