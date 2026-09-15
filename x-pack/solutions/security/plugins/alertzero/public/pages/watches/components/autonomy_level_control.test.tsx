/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { AutonomyLevelControl } from './autonomy_level_control';

const AD_WORKER_ID = 'system-security-floor-attack-discovery';
const TRIAGE_WORKER_ID = 'system-security-floor-alert-triage';

describe('AutonomyLevelControl (Sep 14 radios)', () => {
  const onChange = jest.fn();

  it('renders radio cards only for allowed levels', () => {
    render(<AutonomyLevelControl workerId={AD_WORKER_ID} current="manual" onChange={onChange} />);
    const group = screen.getByTestId('alertZeroAutonomyLevelControl');
    expect(within(group).getByRole('radio', { name: /Manual/ })).toBeInTheDocument();
    expect(within(group).getByRole('radio', { name: /Supervised/ })).toBeInTheDocument();
    expect(within(group).queryByRole('radio', { name: /Assisted/ })).not.toBeInTheDocument();
  });

  it('checks the current level and calls onChange on selection', () => {
    render(
      <AutonomyLevelControl workerId={AD_WORKER_ID} current="supervised" onChange={onChange} />
    );
    const group = screen.getByTestId('alertZeroAutonomyLevelControl');
    const supervised = within(group).getByRole('radio', { name: /Supervised/ });
    expect(supervised).toBeChecked();
    fireEvent.click(within(group).getByRole('radio', { name: /Manual/ }));
    expect(onChange).toHaveBeenLastCalledWith('manual');
  });

  it('renders consequence-forward card copy (Incidents fact with actor pills)', () => {
    render(<AutonomyLevelControl workerId={AD_WORKER_ID} current="manual" onChange={onChange} />);
    const group = screen.getByTestId('alertZeroAutonomyLevelControl');
    expect(within(group).getAllByText('Incidents').length).toBeGreaterThan(0);
    expect(within(group).getAllByText('You').length).toBeGreaterThan(0);
  });

  it('shows the supervised warning callout at the highest level', () => {
    render(
      <AutonomyLevelControl workerId={TRIAGE_WORKER_ID} current="supervised" onChange={onChange} />
    );
    expect(screen.getByTestId('alertZeroAutonomyWarn')).toBeInTheDocument();
  });

  it('hides the warning at manual/assisted levels', () => {
    render(
      <AutonomyLevelControl workerId={TRIAGE_WORKER_ID} current="manual" onChange={onChange} />
    );
    expect(screen.queryByTestId('alertZeroAutonomyWarn')).not.toBeInTheDocument();
  });
});
