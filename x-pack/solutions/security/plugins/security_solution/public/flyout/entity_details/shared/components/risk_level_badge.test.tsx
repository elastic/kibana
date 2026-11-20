/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { USE_NEW_ENTITY_ANALYTICS_HOME_PAGE_FLAG } from '../../../../../common/constants';
import { RiskSeverity } from '../../../../../common/search_strategy';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import { TestProviders } from '../../../../common/mock';
import type { StartServices } from '../../../../types';
import { RISK_SEVERITY_COLOUR } from '../../../../entity_analytics/common/utils';
import { RiskScoreCell } from '../../../../entity_analytics/components/home/entities_table/risk_score_cell';
import { RiskLevelBadge } from './risk_level_badge';

const HIGH_RISK_SCORE = 80;

const renderBadge = (newEntityAnalyticsPage: boolean) => {
  const startServices = createStartServicesMock();
  jest
    .mocked(startServices.featureFlags.useBooleanValue)
    .mockImplementation((flag, fallback) =>
      flag === USE_NEW_ENTITY_ANALYTICS_HOME_PAGE_FLAG ? newEntityAnalyticsPage : fallback
    );

  return render(
    <TestProviders startServices={startServices as StartServices}>
      <RiskLevelBadge riskLevel={RiskSeverity.High} />
      <RiskScoreCell riskScore={HIGH_RISK_SCORE} />
    </TestProviders>
  );
};

const badgeColors = (container: HTMLElement) => {
  const [headerBadge, tableBadge] = container.querySelectorAll<HTMLElement>('.euiBadge');
  const headerText = headerBadge.querySelector('.euiText');
  const tableText = tableBadge.querySelector('.euiText');

  return {
    headerBackground: headerBadge.style.getPropertyValue('--euiBadgeBackgroundColor'),
    tableBackground: tableBadge.style.getPropertyValue('--euiBadgeBackgroundColor'),
    headerText: headerText ? window.getComputedStyle(headerText).color : '',
    tableText: tableText ? window.getComputedStyle(tableText).color : '',
  };
};

describe('RiskLevelBadge', () => {
  it('keeps the severity color when the new entity analytics page flag is off', () => {
    const { container, getByText } = renderBadge(false);
    const colors = badgeColors(container);

    expect(getByText('Risk: High')).toBeInTheDocument();
    expect(colors.headerBackground).toBe(RISK_SEVERITY_COLOUR[RiskSeverity.High]);
    expect(colors.headerBackground).not.toBe(colors.tableBackground);
  });

  it('uses the entities table risk colors when the new entity analytics page flag is on', () => {
    const { container, getByText } = renderBadge(true);
    const colors = badgeColors(container);

    expect(getByText('Risk: High')).toBeInTheDocument();
    expect(colors.headerBackground).toBe(colors.tableBackground);
    expect(colors.headerBackground).not.toBe('');
    expect(colors.headerText).toBe(colors.tableText);
    expect(colors.headerText).not.toBe('');
  });
});
