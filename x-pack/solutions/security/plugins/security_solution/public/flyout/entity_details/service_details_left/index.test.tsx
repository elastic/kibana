/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProviders } from '../../../common/mock';
import { render } from '@testing-library/react';
import React from 'react';
import { ServiceDetailsPanel } from '.';
import { EntityDetailsLeftPanelTab } from '../shared/components/left_panel/left_panel_header';

describe('LeftPanel', () => {
  it('renders', () => {
    const { queryByText } = render(
      <ServiceDetailsPanel
        path={{
          tab: EntityDetailsLeftPanelTab.RISK_INPUTS,
        }}
        isRiskScoreExist
        identityFields={{ 'service.name': 'test service' }}
        scopeId={'scopeId'}
      />,
      {
        wrapper: TestProviders,
      }
    );

    const tabElement = queryByText('Risk score');

    expect(tabElement).toBeInTheDocument();
  });

  it('does not render the tab if tab is not found', () => {
    const { queryByText } = render(
      <ServiceDetailsPanel
        path={{
          tab: EntityDetailsLeftPanelTab.RISK_INPUTS,
        }}
        isRiskScoreExist={false}
        identityFields={{ 'service.name': 'test service' }}
        scopeId={'scopeId'}
      />,
      {
        wrapper: TestProviders,
      }
    );

    const tabElement = queryByText('Risk Inputs');

    expect(tabElement).not.toBeInTheDocument();
  });
});
