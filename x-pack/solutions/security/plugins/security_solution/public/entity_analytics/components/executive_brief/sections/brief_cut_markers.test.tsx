/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { EuiProvider, useEuiTheme } from '@elastic/eui';
import { ThemeProvider } from '@emotion/react';
import { I18nProvider } from '@kbn/i18n-react';
import { FIXTURE_JOB_SUCCEEDED } from '../../../../../common/entity_analytics/executive_brief/__fixtures__/brief';
import type {
  BriefSnapshot,
  ExecutiveBriefDecision,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { BriefContextProvider } from '../components/brief_context';
import { BRIEF_CUT_ATTRIBUTE } from '../constants';
import { Decisions } from './decisions';
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
    tactics: [],
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
            <BriefContextProvider snapshot={snapshot} isPrintMode>
              {children}
            </BriefContextProvider>
          </I18nProvider>
        </ThemeBridge>
      </EuiProvider>
    ),
  });

const cutMarkers = (container: HTMLElement) =>
  container.querySelectorAll(`[${BRIEF_CUT_ATTRIBUTE}]`);

describe('PDF cut point markers (print mode)', () => {
  it('marks the storyline card diagram, timeline, response row and inline decisions', () => {
    const [storyline] = snapshot.storylines.storylines;
    const narrative = FIXTURE_JOB_SUCCEEDED.brief?.storylines.find(
      ({ storylineId }) => storylineId === storyline.evidenceId
    );
    const decision: ExecutiveBriefDecision = {
      action: 'Reset credentials',
      rationale: 'Because.',
      urgency: 'now',
      relatesTo: storyline.evidenceId,
      targets: [],
      evidence: [storyline.evidenceId],
      agentPrompt: 'Investigate.',
    };
    if (!narrative) throw new Error('missing narrative');
    const { container } = render(
      <StorylineCard
        snapshot={snapshot}
        storyline={storyline}
        narrative={narrative}
        decisions={[{ decision, index: 0 }]}
      />
    );
    // diagram, timeline heading, response row, one inline decision, plus timeline items after the first
    expect(cutMarkers(container).length).toBeGreaterThanOrEqual(4);
    const inline = container.querySelector('[data-test-subj="executiveBriefDecision-0-inline"]');
    expect(inline?.parentElement).toHaveAttribute(BRIEF_CUT_ATTRIBUTE);
  });

  it('marks every decision after the first', () => {
    const decisions = Array.from({ length: 3 }, (_, index) => ({
      action: `Action ${index}`,
      rationale: 'Because.',
      urgency: 'now' as const,
      relatesTo: 'STORY-1' as const,
      targets: [],
      evidence: ['STORY-1' as const],
      agentPrompt: 'Investigate.',
    }));
    const { container } = render(<Decisions decisions={decisions} />);
    expect(cutMarkers(container)).toHaveLength(2);
  });
});
