/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { useKiGeneration } from '../knowledge_indicators_table/ki_generation_context';
import { SourcesView } from './sources_view';

const mockCapabilities = { nightshift: { show: true, manage: true, configure: false } };
const mockDeleteSource = { mutate: jest.fn(), isLoading: false };

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    core: { application: { capabilities: mockCapabilities } },
    dependencies: { start: {} },
  }),
}));
jest.mock('../knowledge_indicators_table/ki_generation_context', () => ({
  useKiGeneration: jest.fn(),
}));
jest.mock('../../../../hooks/use_sources_api', () => ({
  useSourcesApi: () => ({
    setSourceEnabled: { mutate: jest.fn(), isLoading: false },
    deleteSource: mockDeleteSource,
    resetSourceKnowledge: { mutate: jest.fn(), isLoading: false },
  }),
}));
jest.mock('../../../../hooks/use_ai_features', () => ({ useAIFeatures: () => null }));
jest.mock('../../../../hooks/use_significant_events_maintenance', () => ({
  useBlocksNewActivity: () => ({ blocksActivity: false, activityBlockTooltip: undefined }),
}));
jest.mock('../../context/significant_events_page_context', () => ({
  useSignificantEventsPageContext: () => ({
    isRunning: false,
    isCanceling: false,
    handleRun: jest.fn(),
    handleCancel: jest.fn(),
  }),
}));
jest.mock('@kbn/cps-utils', () => ({ useIsCpsMultiProject: () => false }));
jest.mock('../../../../components/search_bar', () => ({ SignificantEventsSearchBar: () => null }));
jest.mock('../shared/generate_split_button', () => ({ GenerateSplitButton: () => null }));
jest.mock('../shared/find_significant_events_button', () => ({
  FindSignificantEventsButton: () => null,
}));
jest.mock('./knowledge_indicators_column', () => ({ KnowledgeIndicatorsColumn: () => null }));
jest.mock('./queries_column', () => ({ QueriesColumn: () => null }));
jest.mock('./significant_events_column', () => ({ SignificantEventsColumn: () => null }));
jest.mock('./source_flyout/source_flyout', () => ({
  SourceFlyout: ({ source, readOnly }: { source?: NightshiftSource; readOnly?: boolean }) => (
    <div data-test-subj="sourceFlyoutMock">
      {source?.title ?? 'new source'}
      {readOnly ? ' (read-only)' : ''}
    </div>
  ),
}));

const mockUseKiGeneration = useKiGeneration as jest.MockedFunction<typeof useKiGeneration>;

const nginxSource: NightshiftSource = {
  id: 'source-1',
  title: 'Nginx errors',
  tags: [],
  esql: 'FROM logs-nginx-* | WHERE status >= 500',
  slug: 'nginx-errors',
  view_name: '$.nightshift.sources.default.nginx-errors',
  enabled: true,
  created_by: 'marco',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  esql_updated_at: '2026-09-01T00:00:00.000Z',
};

const makeSource = (
  overrides: Partial<NightshiftSource> & Pick<NightshiftSource, 'id'>
): NightshiftSource => ({ ...nginxSource, ...overrides });

const makeKiGeneration = ({
  sources,
  isSourcesError = false,
  refetchSources = jest.fn(),
}: {
  sources: NightshiftSource[];
  isSourcesError?: boolean;
  refetchSources?: jest.Mock;
}): ReturnType<typeof useKiGeneration> => ({
  sources,
  isSourcesLoading: false,
  isSourcesError,
  refetchSources,
  isInitialGenerationStatusLoading: false,
  generatingStreamNames: [],
  isGenerating: false,
  isScheduling: false,
  streamStatusMap: {},
  onboardingConfig: { steps: [], connectors: {} },
  setOnboardingConfig: jest.fn(),
  featuresConnectors: { resolvedConnectorId: undefined, loading: false },
  queriesConnectors: { resolvedConnectorId: undefined, loading: false },
  bulkOnboardAll: jest.fn(),
  bulkOnboardFeaturesOnly: jest.fn(),
  bulkOnboardQueriesOnly: jest.fn(),
  bulkScheduleOnboarding: jest.fn(),
  cancelOnboarding: jest.fn(),
});

const setup = ({
  sources,
  canManage,
  isSourcesError,
  refetchSources,
}: {
  sources: NightshiftSource[];
  canManage: boolean;
  isSourcesError?: boolean;
  refetchSources?: jest.Mock;
}) => {
  mockCapabilities.nightshift.manage = canManage;
  mockUseKiGeneration.mockReturnValue(
    makeKiGeneration({ sources, isSourcesError, refetchSources })
  );

  return render(
    <I18nProvider>
      <SourcesView />
    </I18nProvider>
  );
};

describe('SourcesView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('offers to create the first source when the space has none', () => {
    setup({ sources: [], canManage: true });

    fireEvent.click(screen.getByTestId('significantEventsAppSourcesEmptyPromptCreateButton'));

    expect(screen.getByTestId('sourceFlyoutMock')).toHaveTextContent('new source');
  });

  it('shows the empty state without a create button to read-only users', () => {
    setup({ sources: [], canManage: false });

    expect(screen.getByTestId('significantEventsAppSourcesEmptyPrompt')).toHaveTextContent(
      'No sources yet'
    );
    expect(
      screen.queryByTestId('significantEventsAppSourcesEmptyPromptCreateButton')
    ).not.toBeInTheDocument();
  });

  it('offers a retry instead of the empty state when the source list fails to load', () => {
    const refetchSources = jest.fn();
    setup({ sources: [], canManage: true, isSourcesError: true, refetchSources });

    expect(screen.queryByTestId('significantEventsAppSourcesEmptyPrompt')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('significantEventsAppSourcesLoadErrorRetryButton'));

    expect(refetchSources).toHaveBeenCalled();
  });

  it('stays on the current page when the source list refreshes', () => {
    const sources = Array.from({ length: 30 }, (_, index) =>
      makeSource({ id: `source-${index}`, title: `Source ${String(index).padStart(2, '0')}` })
    );
    const { rerender } = setup({ sources, canManage: false });

    fireEvent.click(screen.getByTestId('pagination-button-1'));
    expect(screen.getByText('Source 29')).toBeInTheDocument();

    mockUseKiGeneration.mockReturnValue(makeKiGeneration({ sources: [...sources] }));
    rerender(
      <I18nProvider>
        <SourcesView />
      </I18nProvider>
    );

    expect(screen.getByText('Source 29')).toBeInTheDocument();
    expect(screen.queryByText('Source 00')).not.toBeInTheDocument();
  });

  it('keeps the enable switch read-only and hides row actions without manage', () => {
    setup({ sources: [nginxSource], canManage: false });

    expect(
      screen.getByTestId('significantEventsAppSourcesTableEnabledSwitch-source-1')
    ).toBeDisabled();
    expect(
      screen.queryByTestId('significantEventsAppSourceActions-source-1')
    ).not.toBeInTheDocument();
  });

  it('opens the source read-only from its title without manage', () => {
    setup({ sources: [nginxSource], canManage: false });

    fireEvent.click(screen.getByTestId('significantEventsAppSourcesTableTitleLink-source-1'));

    expect(screen.getByTestId('sourceFlyoutMock')).toHaveTextContent('Nginx errors (read-only)');
  });

  it('opens the source editable from its title with manage', () => {
    setup({ sources: [nginxSource], canManage: true });

    fireEvent.click(screen.getByTestId('significantEventsAppSourcesTableTitleLink-source-1'));

    expect(screen.getByTestId('sourceFlyoutMock')).toHaveTextContent(/^Nginx errors$/);
  });

  it('shows the onboard, reset and delete actions inline, without an overflow menu', () => {
    setup({ sources: [nginxSource], canManage: true });

    expect(screen.getByTestId('significantEventsAppSourcesTableOnboardButton')).toBeEnabled();
    expect(screen.getByTestId('significantEventsAppSourcesTableResetButton')).toBeEnabled();
    expect(screen.getByTestId('significantEventsAppSourcesTableDeleteButton')).toBeEnabled();
    expect(screen.queryByTestId('euiCollapsedItemActionsButton')).not.toBeInTheDocument();
  });

  it('deletes a source only after the confirmation', () => {
    setup({ sources: [nginxSource], canManage: true });

    fireEvent.click(screen.getByTestId('significantEventsAppSourcesTableDeleteButton'));
    expect(mockDeleteSource.mutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(mockDeleteSource.mutate).toHaveBeenCalledWith(nginxSource, expect.any(Object));
  });
});
