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
import { BriefContextProvider, useStorylineOpenRequest } from '../components/brief_context';
import { buildTriageMessage, buildTriagePrompt } from '../utils/triage_prompts';
import { briefToMarkdown } from '../utils/brief_to_markdown';
import { AtAGlance } from './at_a_glance';

const mockOpenChat = jest.fn();
let mockAgentBuilder: { openChat?: jest.Mock } | undefined;

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { agentBuilder: mockAgentBuilder } }),
}));

const OpenRequestProbe: React.FC = () => {
  const request = useStorylineOpenRequest();
  return <span data-test-subj="openRequestProbe">{request ? String(request.rank) : 'none'}</span>;
};

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
      evidence: ['GAP-B12'],
    },
    {
      id: 'threats',
      level: 'urgent',
      summary: '1 critical threat unaddressed',
      rule: 'threat rule',
      evidence: ['STORY-1'],
    },
    {
      id: 'coverage',
      level: 'action',
      summary: 'Lateral Movement: 1 of 2 rules not working',
      rule: 'coverage rule',
      evidence: ['TAC-TA0008'],
    },
    {
      id: 'response',
      level: 'action',
      summary: '9 high/critical alerts have no case',
      rule: 'response rule',
      evidence: ['GAP-B17'],
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
          <AtAGlance snapshot={snapshot} glance={brief.glance} brief={brief} />
          <OpenRequestProbe />
        </BriefContextProvider>
      </ThemeBridge>
    </EuiProvider>
  );
};

beforeEach(() => {
  mockOpenChat.mockReset();
  mockAgentBuilder = { openChat: mockOpenChat };
});

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
    ['Threat activity', 'Response', 'Detection coverage', 'Visibility'].forEach((name, index) => {
      expect(within(rows[index]).getByText(name)).toBeInTheDocument();
    });
    expect(within(rows[0]).getByText('Urgent')).toBeInTheDocument();
    expect(within(rows[0]).getByText('1 critical threat unaddressed')).toBeInTheDocument();
    expect(within(rows[3]).getByText('Watch')).toBeInTheDocument();
    expect(within(rows[3]).getByText('ML off · 173 identities unresolved')).toBeInTheDocument();
  });

  it('does not make the whole row a click target', () => {
    renderGlance(makeJob(makeAssessment()));
    const row = screen.getByTestId('executiveBriefAttentionRow-coverage');
    expect(row).not.toHaveAttribute('role');
    expect(row).not.toHaveAttribute('tabindex');
  });

  it('scrolls to the target section when a row View button is clicked', () => {
    const target = addScrollTarget('executiveBriefBlindSpots');
    renderGlance(makeJob(makeAssessment()));
    fireEvent.click(screen.getByTestId('executiveBriefAreaView-coverage'));
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

  it('prints rule text instead of the tooltip in print mode', () => {
    renderGlance(makeJob(makeAssessment()), true);
    expect(screen.queryByTestId('executiveBriefAreaPill-threats')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('executiveBriefAreaRulePrint')).toHaveLength(4);
  });
});

const addScrollTarget = (id: string): HTMLElement => {
  const target = document.createElement('div');
  target.id = id;
  target.scrollIntoView = jest.fn();
  document.body.appendChild(target);
  return target;
};

describe('AtAGlance verdict actions', () => {
  it.each<[AttentionLevel, string, string | undefined, string | undefined]>([
    ['urgent', 'Triage Threat 1 and decide on ownership', 'Triage with AI Agent', 'View threat'],
    ['action', 'Assign the 9 unowned high/critical alerts', 'Triage with AI Agent', 'View threat'],
    ['watch', 'Close the visibility gaps', 'Review with AI Agent', 'View'],
    ['clear', undefined, undefined, undefined],
  ])('level %s shows next step %s with the right buttons', (level, nextStep, ai, view) => {
    const base = makeAssessment({ level });
    const levelFor = (id: string): AttentionLevel => {
      if (level === 'urgent') return base.areas.find((area) => area.id === id)?.level ?? 'clear';
      if (level === 'action') return id === 'response' || id === 'coverage' ? 'action' : 'clear';
      if (level === 'watch') return id === 'visibility' ? 'watch' : 'clear';
      return 'clear';
    };
    const adjusted = base.areas.map((area) => ({ ...area, level: levelFor(area.id) }));
    renderGlance(makeJob({ ...base, areas: adjusted }));
    if (!nextStep) {
      expect(screen.queryByTestId('executiveBriefNextStep')).not.toBeInTheDocument();
      expect(screen.queryByTestId('executiveBriefVerdictTriage')).not.toBeInTheDocument();
      expect(screen.queryByTestId('executiveBriefVerdictView')).not.toBeInTheDocument();
      return;
    }
    expect(screen.getByTestId('executiveBriefNextStep')).toHaveTextContent(
      `Next step: ${nextStep}`
    );
    expect(screen.getByTestId('executiveBriefVerdictTriage')).toHaveTextContent(ai ?? '');
    expect(screen.getByTestId('executiveBriefVerdictView')).toHaveTextContent(view ?? '');
  });

  it('derives the coverage next step from the tactic', () => {
    const base = makeAssessment({ level: 'action' });
    const areas = base.areas.filter(({ id }) => id === 'coverage');
    renderGlance(makeJob({ ...base, areas }));
    expect(screen.getByTestId('executiveBriefNextStep')).toHaveTextContent(
      'Next step: Review Lateral Movement detection'
    );
    expect(screen.getByTestId('executiveBriefVerdictView')).toHaveTextContent('View blind spots');
  });

  it('opens an agent chat with the top area prompt when triage is clicked', () => {
    const assessment = makeAssessment();
    const job = makeJob(assessment);
    renderGlance(job);
    fireEvent.click(screen.getByTestId('executiveBriefVerdictTriage'));
    const { snapshot, brief } = job;
    const threats = assessment.areas.find(({ id }) => id === 'threats');
    if (!snapshot || !brief || !threats) throw new Error('fixture incomplete');
    expect(mockOpenChat).toHaveBeenCalledTimes(1);
    expect(mockOpenChat).toHaveBeenCalledWith({
      autoSendInitialMessage: false,
      newConversation: true,
      initialMessage: buildTriageMessage(buildTriagePrompt(threats, snapshot, brief)),
      sessionTag: 'security',
    });
    expect(mockOpenChat.mock.calls[0][0].initialMessage).toContain('Triage priority threat 1');
  });

  it('opens a chat for the clicked row', () => {
    const assessment = makeAssessment();
    const job = makeJob(assessment);
    renderGlance(job);
    fireEvent.click(screen.getByTestId('executiveBriefAreaTriage-coverage'));
    const message: string = mockOpenChat.mock.calls[0][0].initialMessage;
    expect(message).toContain('Lateral Movement');
    expect(message).toContain('1 of 2 enabled rules working');
  });

  it('View on the verdict scrolls to the threat and requests the storyline to open', () => {
    const target = addScrollTarget('executiveBriefStorylines');
    renderGlance(makeJob(makeAssessment()));
    expect(screen.getByTestId('openRequestProbe')).toHaveTextContent('none');
    fireEvent.click(screen.getByTestId('executiveBriefVerdictView'));
    expect(target.scrollIntoView).toHaveBeenCalled();
    expect(screen.getByTestId('openRequestProbe')).toHaveTextContent('1');
    target.remove();
  });

  it('View on blind spot areas does not request a storyline', () => {
    const target = addScrollTarget('executiveBriefBlindSpots');
    renderGlance(makeJob(makeAssessment()));
    fireEvent.click(screen.getByTestId('executiveBriefAreaView-visibility'));
    expect(target.scrollIntoView).toHaveBeenCalled();
    expect(screen.getByTestId('openRequestProbe')).toHaveTextContent('none');
    target.remove();
  });

  it('gives every non-clear row View and triage actions, and clear rows none', () => {
    const base = makeAssessment();
    const areas = base.areas.map((area) =>
      area.id === 'visibility' ? { ...area, level: 'clear' as const } : area
    );
    renderGlance(makeJob({ ...base, areas }));
    ['threats', 'response', 'coverage'].forEach((id) => {
      expect(screen.getByTestId(`executiveBriefAreaView-${id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`executiveBriefAreaTriage-${id}`)).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Triage with AI Agent')
      );
    });
    expect(screen.queryByTestId('executiveBriefAreaView-visibility')).not.toBeInTheDocument();
    expect(screen.queryByTestId('executiveBriefAreaTriage-visibility')).not.toBeInTheDocument();
  });

  it('holds the rule in a tooltip on the status pill', async () => {
    renderGlance(makeJob(makeAssessment()));
    expect(screen.queryByText('threat rule')).not.toBeInTheDocument();
    fireEvent.mouseOver(screen.getByTestId('executiveBriefAreaPill-threats'));
    expect(await screen.findByText('threat rule')).toBeInTheDocument();
  });

  it('shows no buttons in print mode but keeps the next step', () => {
    renderGlance(makeJob(makeAssessment()), true);
    expect(screen.getByTestId('executiveBriefNextStep')).toBeInTheDocument();
    expect(screen.queryByTestId('executiveBriefVerdictTriage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('executiveBriefVerdictView')).not.toBeInTheDocument();
    expect(screen.queryByTestId('executiveBriefAreaView-threats')).not.toBeInTheDocument();
    expect(screen.queryByTestId('executiveBriefAreaTriage-threats')).not.toBeInTheDocument();
  });

  it('hides the triage buttons when Agent Builder is unavailable but keeps View', () => {
    mockAgentBuilder = undefined;
    renderGlance(makeJob(makeAssessment()));
    expect(screen.queryByTestId('executiveBriefVerdictTriage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('executiveBriefAreaTriage-threats')).not.toBeInTheDocument();
    expect(screen.getByTestId('executiveBriefVerdictView')).toBeInTheDocument();
    expect(screen.getByTestId('executiveBriefAreaView-threats')).toBeInTheDocument();
  });
});

describe('briefToMarkdown glance', () => {
  it('leads with the level, headline and one bullet per area', () => {
    const markdown = briefToMarkdown(makeJob(makeAssessment()));
    const glance = markdown.split('## At a glance')[1].split('## Priority threats')[0];
    expect(glance).toContain('**Urgent attention needed**');
    expect(glance).toContain(
      '- Priority threats · Threat activity — Urgent: 1 critical threat unaddressed'
    );
    expect(glance).toContain(
      '- Priority threats · Response — Action: 9 high/critical alerts have no case'
    );
    expect(glance).toContain(
      '- Blind spots · Detection coverage — Action: Lateral Movement: 1 of 2 rules not working'
    );
    expect(glance).toContain(
      '- Blind spots · Visibility — Watch: ML off · 173 identities unresolved'
    );
    expect(glance).not.toContain('Posture score');
  });

  it('notes the missing assessment', () => {
    expect(briefToMarkdown(makeJob(undefined))).toContain('Assessment unavailable');
  });
});
