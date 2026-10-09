/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render as rtlRender, screen, within } from '@testing-library/react';
import { EuiProvider, useEuiTheme } from '@elastic/eui';
import { ThemeProvider } from '@emotion/react';
import { I18nProvider } from '@kbn/i18n-react';
import { FIXTURE_JOB_SUCCEEDED } from '../../../../../common/entity_analytics/executive_brief/__fixtures__/brief';
import type { BriefSnapshot } from '../../../../../common/entity_analytics/executive_brief/types';
import { BriefContextProvider } from '../components/brief_context';
import { StorylineCard } from './storyline_card';

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { application: { navigateToUrl: jest.fn() } } }),
  useDateFormat: jest.fn(() => 'MMM D, YYYY @ HH:mm:ss.SSS'),
  useTimeZone: jest.fn(() => 'UTC'),
}));
jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({ openFlyout: jest.fn() }),
}));
jest.mock('../../../../common/hooks/use_is_new_flyout_enabled', () => ({
  useIsNewFlyoutEnabled: () => true,
}));
jest.mock('../../../../common/hooks/use_has_graph_visualization_license', () => ({
  useHasGraphVisualizationLicense: () => true,
}));
jest.mock('../../../../flyout_v2/use_flyout_api', () => ({
  useFlyoutApi: () => ({
    openEntityFlyout: jest.fn(),
    openEntityGraphView: jest.fn(),
    openRuleFlyout: jest.fn(),
  }),
}));
jest.mock('../../../../common/components/links', () => ({
  CaseDetailsLink: ({ children }: { children: React.ReactNode }) => <a href="#case">{children}</a>,
}));
jest.mock('../../../../common/hooks/mitre/use_mitre_configuration', () => ({
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

const ThemeBridge: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  return <ThemeProvider theme={{ euiTheme }}>{children}</ThemeProvider>;
};
const snapshot = FIXTURE_JOB_SUCCEEDED.snapshot as BriefSnapshot;
const render = (ui: React.ReactElement) =>
  rtlRender(ui, {
    wrapper: ({ children }) => (
      <EuiProvider>
        <ThemeBridge>
          <I18nProvider>
            <BriefContextProvider snapshot={snapshot}>{children}</BriefContextProvider>
          </I18nProvider>
        </ThemeBridge>
      </EuiProvider>
    ),
  });

const brief = FIXTURE_JOB_SUCCEEDED.brief;
const [story1, story2] = snapshot.storylines.storylines;
const narrativeFor = (id: string) => {
  const narrative = brief?.storylines.find(({ storylineId }) => storylineId === id);
  if (!narrative) throw new Error('missing narrative');
  return narrative;
};

const toggle = (rank: number) => screen.getByTestId(`executiveBriefStorylineToggle-${rank}`);

describe('StorylineCard', () => {
  it('shows the preview when collapsed and the rank-1 card open by default', () => {
    render(
      <>
        <StorylineCard
          snapshot={snapshot}
          storyline={story1}
          narrative={narrativeFor(story1.evidenceId)}
          decisions={[]}
        />
        <StorylineCard
          snapshot={snapshot}
          storyline={story2}
          narrative={narrativeFor(story2.evidenceId)}
          decisions={[]}
        />
      </>
    );
    expect(screen.getByTestId('executiveBriefStorylineCard-1')).toBeInTheDocument();
    expect(toggle(story1.rank)).toHaveAttribute('aria-expanded', 'true');
    expect(toggle(story2.rank)).toHaveAttribute('aria-expanded', 'false');

    const collapsed = within(screen.getByTestId(`executiveBriefStorylineCard-${story2.rank}`));
    expect(collapsed.getByTestId('executiveBriefSeverity')).toBeInTheDocument();
    expect(collapsed.getAllByTestId('executiveBriefResponseState').length).toBeGreaterThan(0);
    expect(collapsed.getByTestId('executiveBriefConfidence')).toBeInTheDocument();
    expect(collapsed.getByTestId('executiveBriefPreviewEntities')).toBeInTheDocument();
    expect(collapsed.getByTestId('executiveBriefNarrativePreview')).toBeVisible();
    expect(collapsed.getAllByTestId('executiveBriefTacticChip').length).toBeGreaterThan(0);
  });

  it('expands every card with forceExpanded', () => {
    render(
      <StorylineCard
        forceExpanded
        snapshot={snapshot}
        storyline={story2}
        narrative={narrativeFor(story2.evidenceId)}
        decisions={[]}
      />
    );
    expect(toggle(story2.rank)).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByTestId('executiveBriefNarrativePreview')).not.toBeInTheDocument();
  });

  it('shows exposure facts on the diagram nodes', () => {
    render(
      <StorylineCard
        snapshot={snapshot}
        storyline={story1}
        narrative={narrativeFor(story1.evidenceId)}
        decisions={[]}
      />
    );
    const diagram = within(screen.getByTestId('executiveBriefDiagram'));
    story1.entityEuids.forEach((euid) => {
      const entity = snapshot.entities[euid];
      const node = within(diagram.getByTestId(`executiveBriefDiagramNode-${entity.name}`));
      expect(node.getByText(entity.name)).toBeInTheDocument();
      expect(node.getByTestId(`executiveBriefExposure-${entity.name}`)).toBeInTheDocument();
    });
    expect(screen.queryByTestId('executiveBriefExposureColumn')).not.toBeInTheDocument();
  });
});
