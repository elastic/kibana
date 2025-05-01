/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AttackDiscoveryWidget } from '.';
import { TestProviders } from '../../../../common/mock';
import { useFindAttackDiscoveries } from '../../../../attack_discovery/pages/use_find_attack_discoveries';
import type { AttackDiscoveryPanelProps } from './panel';

jest.mock('../../../../attack_discovery/pages/use_find_attack_discoveries', () => ({
  useFindAttackDiscoveries: jest.fn(),
}));

jest.mock('./panel', () => ({
  AttackDiscoveryPanel: ({ attackDiscovery }: AttackDiscoveryPanelProps) => (
    <h1>{attackDiscovery.title}</h1>
  ),
}));
const mockData = {
  id: '123',
  alertIds: ['alert-id-xyz789'],
  detailsMarkdown: `
* Suspicious process \`process.name\`:\`rundll32.exe\` launched by \`process.parent.name\`:\`winword.exe\` on \`host.name\`:\`finance-ws-03\`.
* Network connection initiated by \`process.name\`:\`rundll32.exe\` to \`destination.ip\`:\`203.0.113.25\` on \`destination.port\`:\`443\`.
  `,
  mitreAttackTactics: ['TA0002', 'TA0011'],
  summaryMarkdown:
    'Possible command and control activity initiated by `process.name`:`rundll32.exe` originating from `process.parent.name`:`winword.exe` on host `host.name`:`finance-ws-03`.',
  title: 'Suspicious Rundll32 Network Activity',
};
describe('AttackDiscoveryWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading spinner when data is being fetched', () => {
    (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
      isLoading: true,
      data: null,
    });

    render(
      <TestProviders>
        <AttackDiscoveryWidget id={'123'} />
      </TestProviders>
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders no results message when no data is available', () => {
    (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
      isLoading: false,
      data: null,
    });

    render(
      <TestProviders>
        <AttackDiscoveryWidget id={'123'} />
      </TestProviders>
    );

    expect(screen.getByTestId('no-results')).toBeInTheDocument();
  });

  it('renders attack discovery details when data is available', () => {
    (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
      isLoading: false,
      data: { data: [mockData] },
    });

    render(
      <TestProviders>
        <AttackDiscoveryWidget id={'123'} />
      </TestProviders>
    );

    expect(screen.getByText(mockData.title)).toBeInTheDocument();
    expect(screen.queryByTestId('attackDiscoveryAccordion')).not.toBeInTheDocument();
  });

  it('renders attack discovery accordion when multiple attack discoveries exist', () => {
    const additionalTitle = 'Another discovery';
    (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
      isLoading: false,
      data: { data: [mockData, { ...mockData, title: additionalTitle }] },
    });
    render(
      <TestProviders>
        <AttackDiscoveryWidget id={'123'} />
      </TestProviders>
    );
    expect(screen.getByTestId('attackDiscoveryAccordion')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('attackDiscoveryAccordion'));
    expect(screen.getByText(additionalTitle)).toBeInTheDocument();
  });
});
