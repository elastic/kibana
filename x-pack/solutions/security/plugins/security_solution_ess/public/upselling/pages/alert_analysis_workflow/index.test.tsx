/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { AlertAnalysisWorkflowUpsellingPageESS } from '.';

jest.mock('../attack_discovery/upgrade_actions', () => ({
  UpgradeActions: () => <button type="button">{'Upgrade'}</button>,
}));

jest.mock('@kbn/shared-ux-page-kibana-template', () => {
  const KibanaPageTemplate = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  // eslint-disable-next-line react/display-name
  KibanaPageTemplate.Section = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  );
  return { KibanaPageTemplate };
});

describe('AlertAnalysisWorkflowUpsellingPageESS', () => {
  it('renders the availability and upgrade messages with upgrade actions', () => {
    render(<AlertAnalysisWorkflowUpsellingPageESS />);

    expect(screen.getByTestId('alertAnalysisWorkflowUpsellingPage')).toBeInTheDocument();
    expect(screen.getByTestId('availabilityMessage')).toBeInTheDocument();
    expect(screen.getByTestId('upgradeMessage')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upgrade' })).toBeInTheDocument();
  });
});
