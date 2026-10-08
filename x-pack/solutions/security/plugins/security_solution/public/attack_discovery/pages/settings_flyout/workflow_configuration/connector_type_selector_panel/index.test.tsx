/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { ConnectorTypeSelectorPanel } from '.';

const TITLE_ID = 'alertActionTypeTitle';

const renderWithMockActionForm = () =>
  render(
    <ConnectorTypeSelectorPanel>
      <div>
        <div data-test-subj="existingConnectorConfig">{'Elastic-Cloud-SMTP'}</div>
        <div id={TITLE_ID} data-test-subj="titleRow">
          <h5>{'Select a connector type'}</h5>
        </div>
        <div />
        <div data-test-subj="keypadGrid">
          <span>{'Email'}</span>
          <span>{'Slack'}</span>
        </div>
      </div>
    </ConnectorTypeSelectorPanel>
  );

describe('ConnectorTypeSelectorPanel', () => {
  it('renders the container with data-test-subj', () => {
    renderWithMockActionForm();

    expect(screen.getByTestId('connectorTypeSelectorPanel')).toBeInTheDocument();
  });

  it('renders children', () => {
    renderWithMockActionForm();

    expect(screen.getByText('Select a connector type')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Slack')).toBeInTheDocument();
  });

  it('renders the existing connector config', () => {
    renderWithMockActionForm();

    expect(screen.getByText('Elastic-Cloud-SMTP')).toBeInTheDocument();
  });

  it('updates the container CSS class when the title row is clicked (toggle closed)', () => {
    renderWithMockActionForm();

    const container = screen.getByTestId('connectorTypeSelectorPanel');
    const initialClassName = container.className;

    const titleRow = screen.getByTestId('titleRow');
    fireEvent.click(titleRow);

    expect(container.className).not.toEqual(initialClassName);
  });

  it('restores the original CSS class after two clicks (toggle open again)', () => {
    renderWithMockActionForm();

    const container = screen.getByTestId('connectorTypeSelectorPanel');
    const initialClassName = container.className;

    const titleRow = screen.getByTestId('titleRow');
    fireEvent.click(titleRow);
    fireEvent.click(titleRow);

    expect(container.className).toEqual(initialClassName);
  });

  it('does not toggle when clicking outside the title row', () => {
    renderWithMockActionForm();

    const container = screen.getByTestId('connectorTypeSelectorPanel');
    const initialClassName = container.className;

    const connectorConfig = screen.getByText('Elastic-Cloud-SMTP');
    fireEvent.click(connectorConfig);

    expect(container.className).toEqual(initialClassName);
  });
});
