/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { fireEvent, render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import { EuiProvider, useEuiTheme } from '@elastic/eui';
import { ThemeProvider } from '@emotion/react';
import { I18nProvider } from '@kbn/i18n-react';
import { FIXTURE_JOB_SUCCEEDED } from '../../../../common/entity_analytics/executive_brief/__fixtures__/brief';
import type { ExecutiveBriefJob } from '../../../../common/entity_analytics/executive_brief/types';
import realJob from './__fixtures__/real_job.json';
import type { UseExecutiveBriefResult } from './hooks/use_executive_brief';
import { ExecutiveBriefFlyout } from './executive_brief_flyout';
import { TEST_IDS } from './test_ids';

const ThemeBridge: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  return <ThemeProvider theme={{ euiTheme }}>{children}</ThemeProvider>;
};

const Wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <EuiProvider>
    <ThemeBridge>
      <I18nProvider>{children}</I18nProvider>
    </ThemeBridge>
  </EuiProvider>
);

const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: Wrapper });

const mockUseExecutiveBrief = jest.fn<UseExecutiveBriefResult, [string]>();
jest.mock('./hooks/use_executive_brief', () => ({
  useExecutiveBrief: (range: string) => mockUseExecutiveBrief(range),
}));

const mockUseBriefConnectors = jest.fn();
jest.mock('./hooks/use_brief_connectors', () => ({
  TEMPLATE_OPTION_ID: 'template',
  useBriefConnectors: () => mockUseBriefConnectors(),
}));

const mockOpenChat = jest.fn();
jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      agentBuilder: { openChat: mockOpenChat },
      application: { navigateToUrl: jest.fn() },
      http: { basePath: { prepend: (path: string) => path } },
    },
  }),
  useDateFormat: jest.fn(() => 'MMM D, YYYY @ HH:mm:ss.SSS'),
  useTimeZone: jest.fn(() => 'UTC'),
}));

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({ openFlyout: jest.fn() }),
}));
jest.mock('../../../common/hooks/use_is_new_flyout_enabled', () => ({
  useIsNewFlyoutEnabled: () => true,
}));
jest.mock('../../../common/hooks/use_has_graph_visualization_license', () => ({
  useHasGraphVisualizationLicense: () => true,
}));
jest.mock('../../../flyout_v2/use_flyout_api', () => ({
  useFlyoutApi: () => ({
    openEntityFlyout: jest.fn(),
    openEntityGraphView: jest.fn(),
    openRuleFlyout: jest.fn(),
  }),
}));
let mockDiagramShouldThrow = false;
jest.mock('./components/storyline_diagram/storyline_diagram', () => {
  const actual = jest.requireActual('./components/storyline_diagram/storyline_diagram');
  return {
    ...actual,
    StorylineDiagram: (props: Parameters<typeof actual.StorylineDiagram>[0]) => {
      if (mockDiagramShouldThrow) throw new Error('CycleException');
      return actual.StorylineDiagram(props);
    },
  };
});
jest.mock('../../../common/components/links', () => ({
  CaseDetailsLink: ({ children }: { children: React.ReactNode }) => <a href="#case">{children}</a>,
}));
jest.mock('../../../common/hooks/mitre/use_mitre_configuration', () => ({
  useMitreConfiguration: () => ({
    tactics: [
      { id: 'TA0001', name: 'Initial Access', position: 2 },
      { id: 'TA0002', name: 'Execution', position: 3 },
      { id: 'TA0004', name: 'Privilege Escalation', position: 5 },
      { id: 'TA0006', name: 'Credential Access', position: 8 },
      { id: 'TA0008', name: 'Lateral Movement', position: 10 },
    ],
    techniques: [],
    subtechniques: [],
    isLoading: false,
    isError: false,
  }),
}));
jest.mock('../anomalies/mitre/components/mitre_attack_chain', () => ({
  MitreAttackChain: ({ triggeredTactics }: { triggeredTactics: string[] }) => (
    <div data-test-subj="mitreChainStub">{triggeredTactics.join(',')}</div>
  ),
}));

const baseResult: UseExecutiveBriefResult = {
  job: FIXTURE_JOB_SUCCEEDED,
  isGenerating: false,
  requestError: undefined,
  mode: 'names',
  regenerate: jest.fn(),
};

const connectorsResult = {
  connectors: [
    { id: 'sonnet', name: 'Claude Sonnet 5', actionTypeId: '.inference' },
    { id: 'gpt', name: 'GPT', actionTypeId: '.gen-ai' },
  ],
  isLoading: false,
  selectedId: 'sonnet',
  setSelectedId: jest.fn(),
  selection: { isReady: true, generator: 'inference', connectorId: 'sonnet' },
  selectedName: 'Claude Sonnet 5',
  getConnectorName: (id?: string) => (id === 'sonnet' ? 'Claude Sonnet 5' : undefined),
};

describe('ExecutiveBriefFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBriefConnectors.mockReturnValue(connectorsResult);
    mockUseExecutiveBrief.mockReturnValue(baseResult);
  });

  it('renders all sections from the succeeded fixture job', () => {
    render(<ExecutiveBriefFlyout timeRange="7d" onClose={jest.fn()} />);

    expect(screen.getByTestId('executiveBriefAtAGlance')).toBeInTheDocument();
    expect(screen.getByTestId('executiveBriefStorylines')).toBeInTheDocument();
    expect(screen.getByTestId('executiveBriefBlindSpots')).toBeInTheDocument();
    expect(screen.getByTestId('executiveBriefDecisions')).toBeInTheDocument();
    expect(screen.getByTestId('executiveBriefDetails')).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.debugPanel)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.basedOn)).toBeInTheDocument();
    ['postureScore', 'materialRiskEntities', 'activeSignals', 'stagesWithActivity'].forEach((id) =>
      expect(screen.getByTestId(TEST_IDS.statTile(id))).toBeInTheDocument()
    );
  });

  it('renders the stat delta', () => {
    render(<ExecutiveBriefFlyout timeRange="7d" onClose={jest.fn()} />);

    const tile = screen.getByTestId(TEST_IDS.statTile('materialRiskEntities'));
    expect(within(tile).getByText('+4')).toBeInTheDocument();
    expect(tile.querySelector('.euiBadge')).toHaveAttribute(
      'class',
      expect.stringContaining('euiBadge')
    );
  });

  it('renders one card per storyline and resolves entity chips to names', () => {
    render(<ExecutiveBriefFlyout timeRange="7d" onClose={jest.fn()} />);

    ['STORY-1', 'STORY-2', 'STORY-3'].forEach((id) =>
      expect(screen.getByTestId(TEST_IDS.storylineCard(id))).toBeInTheDocument()
    );
    const story1 = screen.getByTestId(TEST_IDS.storylineCard('STORY-1'));
    const chips = within(story1).getByTestId('executiveBriefEntityChips');
    ['a.rodriguez', 'LAPTOP-FIN03', 'jump-box-01', 'docker-host-prod-01'].forEach((name) =>
      expect(within(chips).getByText(name)).toBeInTheDocument()
    );
    expect(within(story1).getByTestId('executiveBriefDiagram')).toBeInTheDocument();
    expect(within(story1).getAllByTestId('executiveBriefDiagramLabel').length).toBeGreaterThan(0);
    expect(within(story1).getByTestId('executiveBriefOpenGraph')).toBeInTheDocument();
  });

  it('shows the response state for each storyline', () => {
    render(<ExecutiveBriefFlyout timeRange="7d" onClose={jest.fn()} />);

    const story2 = screen.getByTestId(TEST_IDS.storylineCard('STORY-2'));
    expect(within(story2).getAllByText('Being handled').length).toBeGreaterThan(0);
    const story1 = screen.getByTestId(TEST_IDS.storylineCard('STORY-1'));
    expect(within(story1).getAllByText('Unaddressed').length).toBeGreaterThan(0);
  });

  it('flags Lateral Movement as Limited coverage with x/y rules working', () => {
    render(<ExecutiveBriefFlyout timeRange="7d" onClose={jest.fn()} />);

    const tile = screen.getByTestId(TEST_IDS.stageTile('TA0008'));
    expect(within(tile).getByText('Limited coverage')).toBeInTheDocument();
    expect(within(tile).getByText('1 of 2 rules not working')).toBeInTheDocument();
    const execution = screen.getByTestId(TEST_IDS.stageTile('TA0002'));
    expect(within(execution).queryByText('Limited coverage')).not.toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.stageTile('unmapped'))).toBeInTheDocument();
    expect(screen.getByTestId('executiveBriefHeadlineGap')).toHaveTextContent('Lateral Movement');
  });

  it('lists the visibility gaps with fix links', () => {
    render(<ExecutiveBriefFlyout timeRange="7d" onClose={jest.fn()} />);

    const table = screen.getByTestId(TEST_IDS.gapsTable);
    expect(within(table).getByText('No security ML jobs are running')).toBeInTheDocument();
    expect(within(table).getByText('Set up ML')).toBeInTheDocument();
  });

  it('opens the Agent Builder chat from a decision', () => {
    render(<ExecutiveBriefFlyout timeRange="7d" onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId(TEST_IDS.investigate(0)));
    expect(mockOpenChat).toHaveBeenCalledWith(
      expect.objectContaining({
        newConversation: true,
        initialMessage: expect.stringContaining('a.rodriguez activity on jump-box-01'),
      })
    );
  });

  it('shows the progress state with the current stage while generating', () => {
    mockUseExecutiveBrief.mockReturnValue({
      ...baseResult,
      isGenerating: true,
      job: {
        ...FIXTURE_JOB_SUCCEEDED,
        status: 'running',
        stage: 'storylines',
        snapshot: undefined,
        brief: undefined,
      },
    });
    render(<ExecutiveBriefFlyout timeRange="7d" onClose={jest.fn()} />);

    expect(screen.getByTestId(TEST_IDS.progress)).toHaveTextContent(
      'Connecting entities into storylines'
    );
    expect(screen.queryByTestId('executiveBriefStorylines')).not.toBeInTheDocument();
  });

  it('shows an error callout with a working Regenerate action', () => {
    const regenerate = jest.fn();
    mockUseExecutiveBrief.mockReturnValue({
      ...baseResult,
      regenerate,
      job: {
        ...FIXTURE_JOB_SUCCEEDED,
        status: 'failed',
        snapshot: undefined,
        brief: undefined,
        error: { code: 'timeout', message: 'The job timed out' },
      },
    });
    render(<ExecutiveBriefFlyout timeRange="7d" onClose={jest.fn()} />);

    const callout = screen.getByTestId(TEST_IDS.error);
    expect(callout).toHaveTextContent('The job timed out');
    fireEvent.click(within(callout).getByText('Regenerate'));
    expect(regenerate).toHaveBeenCalled();
  });

  it('has Copy as markdown, Export PDF and Regenerate in the footer', () => {
    render(<ExecutiveBriefFlyout timeRange="7d" onClose={jest.fn()} />);

    expect(screen.getByTestId(TEST_IDS.copyMarkdown)).toBeEnabled();
    expect(screen.getByTestId(TEST_IDS.exportPdf)).toBeDisabled();
    expect(screen.getByTestId(TEST_IDS.regenerate)).toBeEnabled();
  });

  it('renders a real generated job with Export PDF enabled', () => {
    mockUseExecutiveBrief.mockReturnValue({
      ...baseResult,
      job: realJob as unknown as ExecutiveBriefJob,
    });
    render(<ExecutiveBriefFlyout timeRange="7d" onClose={jest.fn()} onExportPdf={jest.fn()} />);

    expect(screen.queryByTestId(TEST_IDS.progress)).not.toBeInTheDocument();
    expect(screen.getByTestId('executiveBriefAtAGlance')).toBeInTheDocument();
    expect(screen.getByTestId('executiveBriefStorylines')).toBeInTheDocument();
    expect(screen.getByTestId('executiveBriefBlindSpots')).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.exportPdf)).toBeEnabled();
  });

  it('shows a fallback instead of breaking the flyout when a storyline graph throws', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockDiagramShouldThrow = true;
    render(<ExecutiveBriefFlyout timeRange="7d" onClose={jest.fn()} />);

    expect(screen.getAllByText('Graph unavailable').length).toBeGreaterThan(0);
    expect(screen.getByTestId('executiveBriefBlindSpots')).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.exportPdf)).toBeInTheDocument();
    mockDiagramShouldThrow = false;
    consoleError.mockRestore();
  });

  it('shows the model name in the header and a connector picker with a template option', () => {
    mockUseExecutiveBrief.mockReturnValue({
      ...baseResult,
      job: {
        ...FIXTURE_JOB_SUCCEEDED,
        model: 'Claude Sonnet 5',
        params: { ...FIXTURE_JOB_SUCCEEDED.params, generator: 'inference' },
      },
    });
    render(<ExecutiveBriefFlyout timeRange="7d" onClose={jest.fn()} />);

    expect(screen.getByTestId('executiveBriefMeta')).toHaveTextContent('· Claude Sonnet 5');
    expect(screen.getByTestId('executiveBriefConnectorPicker')).toBeInTheDocument();
  });

  it('shows "Template generator" for template jobs', () => {
    mockUseExecutiveBrief.mockReturnValue({
      ...baseResult,
      job: {
        ...FIXTURE_JOB_SUCCEEDED,
        params: { ...FIXTURE_JOB_SUCCEEDED.params, generator: 'template' },
      },
    });
    render(<ExecutiveBriefFlyout timeRange="7d" onClose={jest.fn()} />);

    expect(screen.getByTestId('executiveBriefMeta')).toHaveTextContent('Template generator');
  });

  it('names the model while the brief is being written', () => {
    mockUseExecutiveBrief.mockReturnValue({
      ...baseResult,
      isGenerating: true,
      job: {
        ...FIXTURE_JOB_SUCCEEDED,
        status: 'running',
        stage: 'generate',
        snapshot: undefined,
        brief: undefined,
      },
    });
    render(<ExecutiveBriefFlyout timeRange="7d" onClose={jest.fn()} />);

    expect(screen.getByTestId(TEST_IDS.progress)).toHaveTextContent(
      'Writing the brief with Claude Sonnet 5'
    );
  });

  it('does not render an owner chip for decisions without an owner', () => {
    const [first, ...rest] = FIXTURE_JOB_SUCCEEDED.brief?.decisions ?? [];
    const decisions = [{ ...first, owner: undefined }, ...rest];
    mockUseExecutiveBrief.mockReturnValue({
      ...baseResult,
      job: {
        ...FIXTURE_JOB_SUCCEEDED,
        brief: {
          ...(FIXTURE_JOB_SUCCEEDED.brief as NonNullable<typeof FIXTURE_JOB_SUCCEEDED.brief>),
          decisions,
        },
      },
    });
    render(<ExecutiveBriefFlyout timeRange="7d" onClose={jest.fn()} />);

    expect(
      within(screen.getByTestId(TEST_IDS.decision(0))).queryByTestId('executiveBriefDecisionOwner')
    ).not.toBeInTheDocument();
  });

  it('shows a warning icon next to a flagged claim', () => {
    mockUseExecutiveBrief.mockReturnValue({
      ...baseResult,
      job: {
        ...FIXTURE_JOB_SUCCEEDED,
        validation: {
          totalClaims: 1,
          droppedClaims: 0,
          invalidEvidenceIds: [],
          unbackedRelations: [],
          inventedNumbers: [],
          flags: [{ claimPath: 'glance.headline', statement: 'x', reason: 'no computed edge' }],
        },
      },
    });
    render(<ExecutiveBriefFlyout timeRange="7d" onClose={jest.fn()} />);

    expect(
      within(screen.getByTestId('executiveBriefThreatNarrative')).getAllByTestId(
        'executiveBriefClaimFlag'
      )
    ).toHaveLength(1);
  });

  it('lists gaps by severity: danger, then warning, then info', () => {
    render(<ExecutiveBriefFlyout timeRange="7d" onClose={jest.fn()} />);

    const rows = within(screen.getByTestId(TEST_IDS.gapsTable)).getAllByRole('row').slice(1);
    const severities = rows.map((row) => row.querySelector('td')?.textContent ?? '');
    const rank = { danger: 0, warning: 1, info: 2 } as const;
    const sorted = [...severities].sort(
      (a, b) => rank[a as keyof typeof rank] - rank[b as keyof typeof rank]
    );
    expect(severities).toEqual(sorted);
  });

  it('exports in print mode: controls hidden and decisions expanded during the capture', async () => {
    const seen: Record<string, boolean> = {};
    const onExportPdf = jest.fn(async () => {
      seen.investigateHidden = screen.queryByTestId(TEST_IDS.investigate(1)) === null;
      seen.printAttr =
        document.getElementById('executiveBriefBody')?.getAttribute('data-print-mode') === 'true';
    });
    render(<ExecutiveBriefFlyout timeRange="7d" onClose={jest.fn()} onExportPdf={onExportPdf} />);

    fireEvent.click(screen.getByTestId(TEST_IDS.exportPdf));
    await waitFor(() => expect(onExportPdf).toHaveBeenCalled());

    expect(seen).toEqual({ investigateHidden: true, printAttr: true });
    await waitFor(() =>
      expect(document.getElementById('executiveBriefBody')?.getAttribute('data-print-mode')).toBe(
        'false'
      )
    );
  });

  it('renders a jump-to nav with section counts', () => {
    render(<ExecutiveBriefFlyout timeRange="7d" onClose={jest.fn()} />);

    const nav = screen.getByTestId('executiveBriefJumpNav');
    expect(within(nav).getByText('At a glance')).toBeInTheDocument();
    expect(within(nav).getByText('Storylines (3)')).toBeInTheDocument();
    expect(within(nav).getByText(/^Blind spots \(\d+ gaps\)$/)).toBeInTheDocument();
    expect(within(nav).getByText(/^Decisions \(\d+\)$/)).toBeInTheDocument();
    expect(within(nav).getByText('Details')).toBeInTheDocument();
  });
});
