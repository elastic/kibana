/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

  it('lays each fact out as a label/value row on one grid, not label above value', () => {
    render(<AutonomyLevelControl workerId={AD_WORKER_ID} current="manual" onChange={onChange} />);
    const [fact] = screen.getAllByTestId('alertZeroAutonomyCardFact');

    // `display: contents` drops the per-fact wrapper from layout so its `dt`/`dd` become columns of
    // the shared grid — that is what keeps every value on the same left edge across rows. The label
    // column is `max-content` so a short label keeps its value beside it rather than past a fixed
    // column, while the grid still aligns the rows with each other.
    expect(fact).toHaveStyleRule('display', 'contents');
    expect(fact.parentElement).toHaveStyleRule('display', 'grid');
    expect(fact.parentElement).toHaveStyleRule(
      'grid-template-columns',
      expect.stringMatching(/^max-content minmax\(0, ?1fr\)$/) as unknown as string
    );
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

  describe('allowedAutonomyLevels (decisions item 3)', () => {
    it('renders only the levels the server allows', () => {
      render(
        <AutonomyLevelControl
          workerId={TRIAGE_WORKER_ID}
          current="manual"
          allowedAutonomyLevels={['manual', 'assisted']}
          onChange={onChange}
        />
      );
      const group = screen.getByTestId('alertZeroAutonomyLevelControl');
      expect(within(group).getByRole('radio', { name: /Manual/ })).toBeInTheDocument();
      expect(within(group).getByRole('radio', { name: /Assisted/ })).toBeInTheDocument();
      expect(within(group).queryByRole('radio', { name: /Supervised/ })).not.toBeInTheDocument();
    });

    it('renders a single allowed level as the one selected option', () => {
      render(
        <AutonomyLevelControl
          workerId={TRIAGE_WORKER_ID}
          current="manual"
          allowedAutonomyLevels={['manual']}
          onChange={onChange}
        />
      );

      expect(screen.getByTestId('alertZeroAutonomyFixedLevel')).toBeInTheDocument();
      // Selected and alone: the level is fixed because nothing else is offered, not because the
      // control was withheld. A second radio here would mean the server's projection was ignored.
      expect(screen.getByRole('radio')).toBeChecked();
      expect(screen.getAllByRole('radio')).toHaveLength(1);
    });

    it('renders a single allowed level as fixed even for a Worker with no card copy', () => {
      render(
        <AutonomyLevelControl
          workerId="system-security-worker-with-no-card-copy"
          current="manual"
          allowedAutonomyLevels={['manual']}
          onChange={onChange}
        />
      );

      expect(screen.getByTestId('alertZeroAutonomyFixedLevel')).toHaveTextContent('Manual');
      expect(screen.getAllByRole('radio')).toHaveLength(1);
      expect(screen.queryByTestId('alertZeroAutonomyCardFact')).not.toBeInTheDocument();
    });

    it('still explains what the level does when there is no choice to make', () => {
      render(
        <AutonomyLevelControl
          workerId={TRIAGE_WORKER_ID}
          current="manual"
          allowedAutonomyLevels={['manual']}
          onChange={onChange}
        />
      );

      expect(screen.getByTestId('alertZeroAutonomyCardWho')).toBeInTheDocument();
      expect(screen.getAllByTestId('alertZeroAutonomyCardFact').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Closures').length).toBeGreaterThan(0);
    });

    it('presents the fixed level as the same card an offered level gets', () => {
      render(
        <AutonomyLevelControl
          workerId={TRIAGE_WORKER_ID}
          current="manual"
          allowedAutonomyLevels={['manual']}
          onChange={onChange}
        />
      );

      // `EuiCheckableCard` forwards `data-test-subj` to its radio, so this subject marks the
      // control inside the card, the same place it lands for the Workers that offer three levels.
      expect(
        within(screen.getByTestId('alertZeroAutonomyCard-manual')).getByRole('radio')
      ).toBeChecked();
      expect(screen.getByTestId('alertZeroAutonomyFixedLevel')).toHaveTextContent('Manual');
      expect(screen.getByTestId('alertZeroAutonomyCardWho')).toBeInTheDocument();
    });

    // React routes a radio's `onChange` off its click event, so an already-checked radio still
    // calls the handler — which is why the fixed branch passes its own no-op rather than the save.
    it('saves nothing when the only level is clicked', () => {
      // Its own mock: the suite's shared one carries calls from the selection tests above.
      const onFixedChange = jest.fn();
      render(
        <AutonomyLevelControl
          workerId={TRIAGE_WORKER_ID}
          current="manual"
          allowedAutonomyLevels={['manual']}
          onChange={onFixedChange}
        />
      );

      fireEvent.click(screen.getByRole('radio'));

      expect(onFixedChange).not.toHaveBeenCalled();
      expect(screen.getByRole('radio')).toBeChecked();
    });

    it('offers every level when the server projects none (pre-field Worker)', () => {
      render(
        <AutonomyLevelControl workerId={TRIAGE_WORKER_ID} current="manual" onChange={onChange} />
      );
      const group = screen.getByTestId('alertZeroAutonomyLevelControl');
      expect(within(group).getAllByRole('radio').length).toBeGreaterThan(1);
    });
  });
});
