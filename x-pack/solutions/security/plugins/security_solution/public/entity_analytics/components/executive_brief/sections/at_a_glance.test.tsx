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
import type {
  AttentionAssessment,
  AttentionLevel,
  ExecutiveBriefJob,
} from '../../../../../common/entity_analytics/executive_brief/types';
import realJob from '../__fixtures__/real_job.json';
import { BriefContextProvider } from '../components/brief_context';
import { briefToMarkdown } from '../utils/brief_to_markdown';
import { AtAGlance } from './at_a_glance';

const ThemeBridge: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  return <ThemeProvider theme={{ euiTheme }}>{children}</ThemeProvider>;
};

const baseJob = realJob as unknown as ExecutiveBriefJob;

const makeAssessment = (overrides: Partial<AttentionAssessment> = {}): AttentionAssessment => ({
  level: 'urgent',
  trend: 'more',
  areas: [
    // deliberately out of order: the UI must sort
    {
      id: 'visibility',
      level: 'watch',
      summary: 'ML off · 173 identities unresolved',
      rule: 'visibility rule',
      evidence: [],
    },
    {
      id: 'threats',
      level: 'urgent',
      summary: '1 critical threat unaddressed',
      rule: 'threat rule',
      evidence: [],
    },
    {
      id: 'coverage',
      level: 'action',
      summary: 'Lateral Movement: 1 of 2 rules not working',
      rule: 'coverage rule',
      evidence: [],
    },
    {
      id: 'response',
      level: 'action',
      summary: '9 high/critical alerts have no case',
      rule: 'response rule',
      evidence: [],
    },
  ],
  ...overrides,
});

const makeJob = (assessment?: AttentionAssessment): ExecutiveBriefJob => {
  const snapshot = baseJob.snapshot;
  if (!snapshot) throw new Error('fixture has no snapshot');
  return { ...baseJob, snapshot: { ...snapshot, glance: { ...snapshot.glance, assessment } } };
};

const renderGlance = (job: ExecutiveBriefJob, isPrintMode = false) => {
  const { snapshot, brief } = job;
  if (!snapshot || !brief) throw new Error('fixture incomplete');
  return rtlRender(
    <EuiProvider>
      <ThemeBridge>
        <BriefContextProvider snapshot={snapshot} isPrintMode={isPrintMode}>
          <AtAGlance snapshot={snapshot} glance={brief.glance} />
        </BriefContextProvider>
      </ThemeBridge>
    </EuiProvider>
  );
};

describe('AtAGlance attention verdict', () => {
  it.each<[AttentionLevel, string, string]>([
    ['urgent', 'Urgent attention needed', 'warning'],
    ['action', 'Attention needed', 'alert'],
    ['watch', 'Keep watching', 'eye'],
    ['clear', 'No action needed', 'checkCircle'],
  ])('renders %s with label and icon', (level, label, icon) => {
    renderGlance(makeJob(makeAssessment({ level })));
    expect(screen.getByTestId('executiveBriefAttentionLabel')).toHaveTextContent(label);
    expect(screen.getByTestId('executiveBriefAttentionIcon')).toHaveAttribute(
      'data-icon-type',
      icon
    );
  });

  it('renders the four areas in order with summaries', () => {
    renderGlance(makeJob(makeAssessment()));
    const rows = ['threats', 'response', 'coverage', 'visibility'].map((id) =>
      screen.getByTestId(`executiveBriefAttentionRow-${id}`)
    );
    ['Active threats', 'Response', 'Detection coverage', 'Visibility'].forEach((name, index) => {
      expect(within(rows[index]).getByText(name)).toBeInTheDocument();
    });
    expect(within(rows[0]).getByText('Urgent')).toBeInTheDocument();
    expect(within(rows[0]).getByText('1 critical threat unaddressed')).toBeInTheDocument();
    expect(within(rows[3]).getByText('Watch')).toBeInTheDocument();
    expect(within(rows[3]).getByText('ML off · 173 identities unresolved')).toBeInTheDocument();
    expect(screen.getByTestId('executiveBriefAreaWhy-threats')).toBeInTheDocument();
  });

  it('scrolls to the target section when a row is clicked', () => {
    const target = document.createElement('div');
    target.id = 'executiveBriefBlindSpots';
    target.scrollIntoView = jest.fn();
    document.body.appendChild(target);
    renderGlance(makeJob(makeAssessment()));
    fireEvent.click(screen.getByTestId('executiveBriefAttentionRow-coverage'));
    expect(target.scrollIntoView).toHaveBeenCalled();
    target.remove();
  });

  it('shows the trend hint for more and less but not same', () => {
    const { unmount } = renderGlance(makeJob(makeAssessment({ trend: 'more' })));
    expect(screen.getByTestId('executiveBriefAttentionTrend')).toHaveTextContent(
      '▲ more activity than last period'
    );
    unmount();
    const less = renderGlance(makeJob(makeAssessment({ trend: 'less' })));
    expect(screen.getByTestId('executiveBriefAttentionTrend')).toHaveTextContent('▼ less');
    less.unmount();
    renderGlance(makeJob(makeAssessment({ trend: 'same' })));
    expect(screen.queryByTestId('executiveBriefAttentionTrend')).not.toBeInTheDocument();
  });

  it('falls back when the assessment is missing', () => {
    renderGlance(makeJob(undefined));
    expect(screen.getByTestId('executiveBriefAttentionLabel')).toHaveTextContent(
      'Assessment unavailable for this brief — regenerate'
    );
    expect(screen.queryByTestId('executiveBriefAttentionRows')).not.toBeInTheDocument();
    expect(screen.getByTestId('executiveBriefNarrative')).toBeInTheDocument();
  });

  it('has no stat tiles', () => {
    renderGlance(makeJob(makeAssessment()));
    ['postureScore', 'materialRiskEntities', 'activeSignals', 'stagesWithActivity'].forEach((id) =>
      expect(screen.queryByTestId(`executiveBriefStatTile-${id}`)).not.toBeInTheDocument()
    );
    expect(screen.queryByText('Posture score')).not.toBeInTheDocument();
  });

  it('prints rule text instead of the why tip in print mode', () => {
    renderGlance(makeJob(makeAssessment()), true);
    expect(screen.queryByTestId('executiveBriefAreaWhy-threats')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('executiveBriefAreaRulePrint')).toHaveLength(4);
  });
});

describe('briefToMarkdown glance', () => {
  it('leads with the level, headline and one bullet per area', () => {
    const markdown = briefToMarkdown(makeJob(makeAssessment()));
    const glance = markdown.split('## At a glance')[1].split('## Priority threats')[0];
    expect(glance).toContain('**Urgent attention needed**');
    expect(glance).toContain('- Active threats — Urgent: 1 critical threat unaddressed');
    expect(glance).toContain('- Response — Action: 9 high/critical alerts have no case');
    expect(glance).toContain(
      '- Detection coverage — Action: Lateral Movement: 1 of 2 rules not working'
    );
    expect(glance).toContain('- Visibility — Watch: ML off · 173 identities unresolved');
    expect(glance).not.toContain('Posture score');
  });

  it('notes the missing assessment', () => {
    expect(briefToMarkdown(makeJob(undefined))).toContain('Assessment unavailable');
  });
});
