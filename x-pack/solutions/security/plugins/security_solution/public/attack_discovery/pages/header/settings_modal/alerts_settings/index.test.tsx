/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { AlertsSettings, MAX_ALERTS } from '.';

const maxAlerts = '150';

const setMaxAlerts = jest.fn();

describe('AlertsSettings', () => {
  it('calls setMaxAlerts when the alerts range changes', () => {
    render(<AlertsSettings maxAlerts={maxAlerts} setMaxAlerts={setMaxAlerts} />);

    fireEvent.click(screen.getByText(`${MAX_ALERTS}`));

    expect(setMaxAlerts).toHaveBeenCalledWith(`${MAX_ALERTS}`);
  });

  it('displays the correct maxAlerts value', () => {
    render(<AlertsSettings maxAlerts={maxAlerts} setMaxAlerts={setMaxAlerts} />);

    expect(screen.getByTestId('alertsRange')).toHaveValue(maxAlerts);
  });

  it('displays the expected text for anonymization settings', () => {
    render(<AlertsSettings maxAlerts={maxAlerts} setMaxAlerts={setMaxAlerts} />);

    expect(screen.getByTestId('latestAndRiskiest')).toHaveTextContent(
      'Send Attack discovery information about your 150 newest and riskiest open or acknowledged alerts.'
    );
  });
});
