/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Subtitle } from './subtitle';
import { getMockAttackDiscoveryAlerts } from '../../../../../attack_discovery/pages/mock/mock_attack_discovery_alerts';

import { getFormattedDate } from '../../../../../attack_discovery/pages/loading_callout/loading_messages/get_formatted_time';

jest.mock(
  '../../../../../attack_discovery/pages/loading_callout/loading_messages/get_formatted_time',
  () => ({
    getFormattedDate: jest.fn(() => '2023-10-27 10:00:00'),
  })
);

jest.mock('../../../../../common/lib/kibana', () => ({
  useDateFormat: jest.fn(() => jest.fn()),
}));

jest.mock(
  '../../../../../attack_discovery/pages/results/attack_discovery_markdown_formatter',
  () => ({
    AttackDiscoveryMarkdownFormatter: jest.fn(({ markdown }) => (
      <div data-test-subj="mock-markdown-formatter">{markdown}</div>
    )),
  })
);

const mockAttack = getMockAttackDiscoveryAlerts()[0];

describe('Subtitle', () => {
  it('should render with formatted date and summary', () => {
    const { getByTestId } = render(<Subtitle attack={mockAttack} />);

    expect(getByTestId('mock-markdown-formatter')).toHaveTextContent(
      'Detected on 2023-10-27 10:00:00 • Malware and credential theft detected on {{ host.name SRVMAC08 }} by {{ user.name james }}.'
    );
  });

  it('should render with formatted date only if summary is missing', () => {
    const attackWithoutSummary = { ...mockAttack, entitySummaryMarkdown: undefined };
    const { getByTestId } = render(<Subtitle attack={attackWithoutSummary} />);

    expect(getByTestId('mock-markdown-formatter')).toHaveTextContent(
      'Detected on 2023-10-27 10:00:00'
    );
  });

  it('should render anonymized summary when showAnonymized is true', () => {
    const { getByTestId } = render(<Subtitle attack={mockAttack} showAnonymized={true} />);

    expect(getByTestId('mock-markdown-formatter')).toHaveTextContent(
      'Detected on 2023-10-27 10:00:00 • Malware and credential theft detected on {{ host.name 3d241119-f77a-454e-8ee3-d36e05a8714f }} by {{ user.name 325761dd-b22b-4fdc-8444-a4ef66d76380 }}.'
    );
  });

  it('should render only summary if formatted date is missing', () => {
    (getFormattedDate as jest.Mock).mockReturnValue(null);
    const { getByTestId } = render(<Subtitle attack={mockAttack} />);

    expect(getByTestId('mock-markdown-formatter')).toHaveTextContent(
      'Malware and credential theft detected on {{ host.name SRVMAC08 }} by {{ user.name james }}.'
    );
    expect(getByTestId('mock-markdown-formatter')).not.toHaveTextContent('Detected on');
    expect(getByTestId('mock-markdown-formatter')).not.toHaveTextContent('•');
  });
});
