/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';
import { render } from '../../../utils/test_helper';
import type { AlertInvestigation } from '../../../hooks/use_investigate_alert';
import { useAlertInvestigationHeaderActions } from './alert_investigation_actions';

const useInvestigateAlertMock = jest.fn<AlertInvestigation, []>();

const InvestigationActions = () => (
  <>{useAlertInvestigationHeaderActions(useInvestigateAlertMock())}</>
);

const idleInvestigation: AlertInvestigation = {
  showInvestigateAction: true,
  hasInvestigation: false,
  showInvestigateButton: false,
  showViewInvestigation: false,
  handleInvestigate: jest.fn(),
  isInvestigating: false,
  investigateActionLabel: 'Investigate',
  investigateEbtProps: {},
  viewInvestigationUrl: undefined,
  viewInvestigationActionLabel: 'View investigation',
  viewInvestigationEbtProps: {},
  markInvestigationViewed: jest.fn(),
};

describe('alert investigation header actions', () => {
  beforeEach(() => {
    useInvestigateAlertMock.mockReturnValue(idleInvestigation);
  });

  it('starts an investigation from an outlined button with the inspect icon', () => {
    const handleInvestigate = jest.fn();
    useInvestigateAlertMock.mockReturnValue({
      ...idleInvestigation,
      showInvestigateButton: true,
      handleInvestigate,
    });

    const { getByTestId } = render(<InvestigationActions />);
    const button = getByTestId('alertDetailsInvestigate');

    expect(button).toHaveTextContent('Investigate');
    expect(button.querySelector('[data-euiicon-type="inspect"]')).not.toBeNull();

    fireEvent.click(button);
    expect(handleInvestigate).toHaveBeenCalled();
  });

  it('links to an investigation from an outlined button with the eye icon', () => {
    const markInvestigationViewed = jest.fn();
    useInvestigateAlertMock.mockReturnValue({
      ...idleInvestigation,
      showViewInvestigation: true,
      viewInvestigationUrl: '/app/nightshift?investigationId=investigation-1',
      markInvestigationViewed,
    });

    const { getByTestId } = render(<InvestigationActions />);
    const button = getByTestId('alertDetailsViewInvestigation');

    expect(button).toHaveTextContent('View investigation');
    expect(button).toHaveAttribute('href', '/app/nightshift?investigationId=investigation-1');
    expect(button.querySelector('[data-euiicon-type="eye"]')).not.toBeNull();

    fireEvent.click(button);
    expect(markInvestigationViewed).toHaveBeenCalledTimes(1);
  });

  it('leaves Re-investigate to the actions menu once the alert has an investigation', () => {
    useInvestigateAlertMock.mockReturnValue({
      ...idleInvestigation,
      hasInvestigation: true,
      showInvestigateButton: true,
      investigateActionLabel: 'Re-investigate',
      showViewInvestigation: true,
      viewInvestigationUrl: '/app/nightshift?investigationId=investigation-1',
    });

    const { queryByTestId, getByTestId } = render(<InvestigationActions />);

    expect(queryByTestId('alertDetailsInvestigate')).not.toBeInTheDocument();
    expect(getByTestId('alertDetailsViewInvestigation')).toBeInTheDocument();
  });

  it('hides both actions when investigation is unavailable', () => {
    const { queryByTestId } = render(<InvestigationActions />);

    expect(queryByTestId('alertDetailsInvestigate')).not.toBeInTheDocument();
    expect(queryByTestId('alertDetailsViewInvestigation')).not.toBeInTheDocument();
  });

  it('links to the running investigation while it is in progress', () => {
    const markInvestigationViewed = jest.fn();
    useInvestigateAlertMock.mockReturnValue({
      ...idleInvestigation,
      isInvestigating: true,
      investigateActionLabel: 'Investigating…',
      viewInvestigationUrl: '/app/nightshift?investigationId=investigation-1',
      markInvestigationViewed,
    });

    const { getByTestId, queryByTestId } = render(<InvestigationActions />);
    const button = getByTestId('alertDetailsInvestigate');

    expect(button).toHaveTextContent('Investigating…');
    expect(button).toHaveAttribute('href', '/app/nightshift?investigationId=investigation-1');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('[role="progressbar"]')).not.toBeNull();
    expect(queryByTestId('alertDetailsViewInvestigation')).not.toBeInTheDocument();

    fireEvent.click(button);
    expect(markInvestigationViewed).toHaveBeenCalledTimes(1);
  });

  it('disables the investigating action until the investigation has a link', () => {
    useInvestigateAlertMock.mockReturnValue({
      ...idleInvestigation,
      isInvestigating: true,
      investigateActionLabel: 'Investigating…',
    });

    const { getByTestId } = render(<InvestigationActions />);

    expect(getByTestId('alertDetailsInvestigate')).toBeDisabled();
  });
});
