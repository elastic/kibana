/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { DecisionTreeCard } from './decision_tree_card';

const renderCard = (props: { hypothesisCount: number; isRunning: boolean; onOpen?: () => void }) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <DecisionTreeCard onOpen={jest.fn()} {...props} />
      </I18nProvider>
    </EuiProvider>
  );

describe('DecisionTreeCard', () => {
  it('summarises how many hypotheses were analyzed', () => {
    renderCard({ hypothesisCount: 5, isRunning: false });

    expect(screen.getByText('View Hypothesis Tree')).toBeInTheDocument();
    expect(screen.getByText('5 hypotheses analyzed')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftDecisionTreeCardTypingDots')).not.toBeInTheDocument();
  });

  it('shows it is still working while the run is in progress', () => {
    renderCard({ hypothesisCount: 1, isRunning: true });

    expect(screen.getByText('1 hypothesis analyzed')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftDecisionTreeCardTypingDots')).toBeInTheDocument();
  });

  it('opens the visualiser when clicked', () => {
    const onOpen = jest.fn();
    renderCard({ hypothesisCount: 2, isRunning: false, onOpen });

    fireEvent.click(screen.getByTestId('nightshiftInvestigationDecisionTreeButton'));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
