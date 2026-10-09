/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { fireEvent, render as rtlRender, screen, within } from '@testing-library/react';
import { EuiProvider, useEuiTheme } from '@elastic/eui';
import { ThemeProvider } from '@emotion/react';
import { I18nProvider } from '@kbn/i18n-react';
import { FIXTURE_JOB_SUCCEEDED } from '../../../../../common/entity_analytics/executive_brief/__fixtures__/brief';
import type {
  BriefSnapshot,
  ExecutiveBriefDecision,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { BriefContextProvider, useStorylineOpenRequest } from '../components/brief_context';
import { Decisions } from './decisions';

const mockOpenChat = jest.fn();

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      application: { navigateToUrl: jest.fn() },
      agentBuilder: { openChat: mockOpenChat },
    },
  }),
}));
jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({ openFlyout: jest.fn() }),
}));
jest.mock('../../../../common/hooks/use_is_new_flyout_enabled', () => ({
  useIsNewFlyoutEnabled: () => true,
}));
jest.mock('../../../../flyout_v2/use_flyout_api', () => ({
  useFlyoutApi: () => ({ openEntityFlyout: jest.fn(), openRuleFlyout: jest.fn() }),
}));
jest.mock('../../../../common/components/links', () => ({
  CaseDetailsLink: ({ children }: { children: React.ReactNode }) => <a href="#case">{children}</a>,
}));

const ThemeBridge: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  return <ThemeProvider theme={{ euiTheme }}>{children}</ThemeProvider>;
};
const OpenRequestProbe: React.FC = () => {
  const request = useStorylineOpenRequest();
  return <span data-test-subj="openRequestProbe">{request ? String(request.rank) : 'none'}</span>;
};
const snapshot = FIXTURE_JOB_SUCCEEDED.snapshot as BriefSnapshot;
const render = (ui: React.ReactElement, isPrintMode = false) =>
  rtlRender(ui, {
    wrapper: ({ children }) => (
      <EuiProvider>
        <ThemeBridge>
          <I18nProvider>
            <BriefContextProvider snapshot={snapshot} isPrintMode={isPrintMode}>
              {children}
              <OpenRequestProbe />
            </BriefContextProvider>
          </I18nProvider>
        </ThemeBridge>
      </EuiProvider>
    ),
  });

const decision = (
  action: string,
  urgency: ExecutiveBriefDecision['urgency'],
  owner?: ExecutiveBriefDecision['owner']
): ExecutiveBriefDecision => ({
  action,
  rationale: `Because of ${action}.`,
  urgency,
  owner,
  relatesTo: 'STORY-1',
  targets: [],
  evidence: ['STORY-1'],
  agentPrompt: 'Investigate.',
});

const decisions = [
  decision('Review later', 'next_review'),
  decision('Act now', 'now', 'soc'),
  decision('Act this week', 'this_week', 'iam'),
  decision('Also now', 'now'),
];

describe('Decisions', () => {
  beforeEach(() => mockOpenChat.mockReset());

  it('groups decisions by urgency, most urgent first, keeping their brief order', () => {
    render(<Decisions decisions={decisions} />);
    const groups = screen.getAllByTestId(/^executiveBriefDecisionGroup-/);
    expect(groups.map((group) => group.getAttribute('data-test-subj'))).toEqual([
      'executiveBriefDecisionGroup-now',
      'executiveBriefDecisionGroup-this_week',
      'executiveBriefDecisionGroup-next_review',
    ]);
    expect(groups[0]).toHaveTextContent('Now');
    const nowRows = within(groups[0]).getAllByTestId(/^executiveBriefDecision-\d+$/);
    expect(nowRows.map((row) => row.getAttribute('data-test-subj'))).toEqual([
      'executiveBriefDecision-1',
      'executiveBriefDecision-3',
    ]);
  });

  it('shows owner and the related threat on a quiet meta line, without urgency pills', () => {
    render(<Decisions decisions={decisions} />);
    const row = screen.getByTestId('executiveBriefDecision-1');
    expect(within(row).getByTestId('executiveBriefDecisionMeta')).toHaveTextContent(
      'Owner: SOC · Threat 1'
    );
    expect(within(row).queryByText('Now')).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('executiveBriefDecision-3')).getByTestId(
        'executiveBriefDecisionMeta'
      )
    ).toHaveTextContent(/^Threat 1$/);
  });

  it('triages from the row without expanding it', () => {
    render(<Decisions decisions={decisions} />);
    fireEvent.click(screen.getByTestId('executiveBriefInvestigate-1'));
    expect(mockOpenChat).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Because of Act now.')).not.toBeVisible();
  });

  it('opens the related threat from the expanded row', () => {
    render(<Decisions decisions={decisions} />);
    fireEvent.click(within(screen.getByTestId('executiveBriefDecision-1')).getByText('Act now'));
    fireEvent.click(
      within(screen.getByTestId('executiveBriefDecision-1')).getByTestId(
        'executiveBriefStoryChip-1'
      )
    );
    expect(screen.getByTestId('openRequestProbe')).toHaveTextContent('1');
  });

  it('expands every row and hides triage in print mode', () => {
    render(<Decisions decisions={decisions} />, true);
    expect(screen.getByText('Because of Act now.')).toBeVisible();
    expect(screen.queryByTestId('executiveBriefInvestigate-1')).not.toBeInTheDocument();
  });
});
