/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { MigrationRulesTable } from '.';
import { createMockStore, mockGlobalState, TestProviders } from '../../../../common/mock';
import { useKibana } from '../../../../common/lib/kibana';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import { useGetMigrationPrebuiltRules } from '../../logic/use_get_migration_prebuilt_rules';
import { useGetMigrationRules } from '../../logic/use_get_migration_rules';
import { useGetMigrationTranslationStats } from '../../logic/use_get_migration_translation_stats';
import { useInstallMigrationRule } from '../../logic/use_install_migration_rule';
import { useInstallMigrationRules } from '../../logic/use_install_migration_rules';
import { useUpdateMigrationRule } from '../../logic/use_update_migration_rule';
import { useUpdateIndexPattern } from '../../logic/use_update_index_pattern';
import { useStartMigration } from '../../logic/use_start_migration';
import { useBulkGetUserProfiles } from '../../../../common/components/user_profiles/use_bulk_get_user_profiles';
import {
  getRuleMigrationStatsMock,
  getRuleMigrationTranslationStatsMock,
} from '../../__mocks__/migration_rule_stats';
import { migrationRules } from '../../__mocks__/migration_rules';
import type { RuleMigrationRule } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import { MigrationSource } from '../../../common/types';
import { of } from 'rxjs';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { DEFAULT_INDEX_KEY, NEW_FEATURES_TOUR_STORAGE_KEYS } from '../../../../../common/constants';
import { allowedExperimentalValues } from '../../../../../common/experimental_features';
import { createSecuritySolutionStorageMock } from '../../../../common/mock/mock_local_storage';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import { licenseService } from '../../../../common/hooks/use_license';
import type { StartServices } from '../../../../types';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../../logic/use_get_migration_rules');
jest.mock('../../logic/use_get_migration_prebuilt_rules');
jest.mock('../../logic/use_get_migration_translation_stats');
jest.mock('../../logic/use_install_migration_rule');
jest.mock('../../logic/use_install_migration_rules');
jest.mock('../../logic/use_update_migration_rule');
jest.mock('../../logic/use_update_index_pattern');
jest.mock('../../logic/use_start_migration');
jest.mock('../../../../common/components/user_profiles/use_bulk_get_user_profiles');

const mockRule = migrationRules[0];
const mockMigrationStats = getRuleMigrationStatsMock();
const mockTranslationStats = getRuleMigrationTranslationStatsMock();

const rules: RuleMigrationRule[] = [
  {
    id: 'qradar-1',
    migration_id: 'qradar-migration-001',
    original_rule: {
      id: 'qradar-rule-100001',
      vendor: 'qradar',
      title: 'Authentication Success',
      description: 'Detects successful authentication',
      query: 'event category authentication',
      query_language: 'aql',
    },
    '@timestamp': '2025-05-06T07:53:48.805Z',
    status: SiemMigrationStatus.COMPLETED,
    created_by: 'test-user',
    updated_by: 'test-user',
    updated_at: '2025-05-06T07:57:24.929Z',
    translation_result: 'full',
    elastic_rule: {
      severity: 'low',
      risk_score: 21,
      query: 'FROM logs-*',
      description: 'Detects successful authentication',
      query_language: 'esql',
      title: 'Authentication Success',
    },
  },
  {
    id: 'qradar-2',
    migration_id: 'qradar-migration-001',
    original_rule: {
      id: 'qradar-rule-100002',
      vendor: 'qradar',
      title: 'Network Traffic Anomaly',
      description: 'Detects network anomalies',
      query: 'event category network',
      query_language: 'aql',
    },
    '@timestamp': '2025-05-06T07:53:48.805Z',
    status: SiemMigrationStatus.COMPLETED,
    created_by: 'test-user',
    updated_by: 'test-user',
    updated_at: '2025-05-06T07:57:27.998Z',
    translation_result: 'partial',
    elastic_rule: {
      severity: 'medium',
      risk_score: 47,
      query: 'FROM logs-*',
      description: 'Detects network anomalies',
      query_language: 'esql',
      title: 'Network Traffic Anomaly',
    },
  },
  {
    id: 'qradar-3',
    migration_id: 'qradar-migration-001',
    original_rule: {
      id: 'qradar-rule-100003',
      vendor: 'qradar',
      title: 'Malware Detection',
      description: 'Detects malware activity',
      query: 'event category malware',
      query_language: 'aql',
    },
    '@timestamp': '2025-05-06T07:53:48.805Z',
    status: SiemMigrationStatus.COMPLETED,
    created_by: 'test-user',
    updated_by: 'test-user',
    updated_at: '2025-05-06T07:57:32.348Z',
    translation_result: 'partial',
    elastic_rule: {
      severity: 'high',
      risk_score: 73,
      query: 'FROM logs-*',
      description: 'Detects malware activity',
      query_language: 'esql',
      title: 'Malware Detection',
    },
  },
  {
    id: 'qradar-4',
    migration_id: 'qradar-migration-001',
    original_rule: {
      id: 'qradar-rule-100004',
      vendor: 'qradar',
      title: 'Failed Translation Rule',
      description: 'Rule that failed to translate',
      query: 'complex unsupported query',
      query_language: 'aql',
    },
    '@timestamp': '2025-05-06T07:53:48.805Z',
    status: SiemMigrationStatus.FAILED,
    created_by: 'test-user',
    updated_by: 'test-user',
    updated_at: '2025-05-06T07:57:33.042Z',
  },
];

const makeTranslatedRule = (id: string, title: string): RuleMigrationRule => ({
  id,
  migration_id: 'migration-1',
  original_rule: {
    id: `orig-${id}`,
    vendor: 'qradar',
    title,
    description: `${title} description`,
    query: 'event category authentication',
    query_language: 'aql',
  },
  '@timestamp': '2025-05-06T07:53:48.805Z',
  status: SiemMigrationStatus.COMPLETED,
  created_by: 'test-user',
  updated_by: 'test-user',
  updated_at: '2025-05-06T07:57:24.929Z',
  translation_result: 'full',
  elastic_rule: {
    severity: 'low',
    risk_score: 21,
    query: 'FROM logs-* | WHERE event.category == "authentication"',
    query_language: 'esql',
    description: `${title} description`,
    title,
  },
});

const makeUntranslatableRule = (id: string, title: string): RuleMigrationRule => ({
  id,
  migration_id: 'migration-1',
  original_rule: {
    id: `orig-${id}`,
    vendor: 'qradar',
    title,
    description: `${title} description`,
    query: 'complex unsupported query',
    query_language: 'aql',
  },
  '@timestamp': '2025-05-06T07:53:48.805Z',
  status: SiemMigrationStatus.COMPLETED,
  created_by: 'test-user',
  updated_by: 'test-user',
  updated_at: '2025-05-06T07:57:24.929Z',
  translation_result: 'untranslatable',
});

const makeFailedRule = (id: string, title: string): RuleMigrationRule => ({
  id,
  migration_id: 'migration-1',
  original_rule: {
    id: `orig-${id}`,
    vendor: 'qradar',
    title,
    description: `${title} description`,
    query: 'complex unsupported query',
    query_language: 'aql',
  },
  '@timestamp': '2025-05-06T07:53:48.805Z',
  status: SiemMigrationStatus.FAILED,
  created_by: 'test-user',
  updated_by: 'test-user',
  updated_at: '2025-05-06T07:57:24.929Z',
});

const threeRules: RuleMigrationRule[] = [
  makeTranslatedRule('rule-1', 'First Rule'),
  makeUntranslatableRule('rule-2', 'Second Rule'),
  makeTranslatedRule('rule-3', 'Third Rule'),
];

const openFlyoutForRule = (title: string) => {
  const link = screen.getByText(title);
  fireEvent.click(link);
};

// The opened row is highlighted purely via CSS: the table wrapper carries an Emotion
// class whose rule targets `.euiTableRow[data-rule-id="<opened id>"]`. Resolve the
// wrapper's current class to find the highlighted row id — stale rules from previous
// positions linger in the stylesheet, so the class must be matched explicitly.
const getHighlightedRuleId = (): string | null => {
  const wrapper = screen.getByTestId('rules-translation-table').parentElement;
  const cssClass = Array.from(wrapper?.classList ?? []).find((cls) => cls.startsWith('css-'));
  if (!cssClass) {
    return null;
  }
  const cssText = Array.from(document.querySelectorAll('style'))
    .map((tag) => {
      const sheet = tag.sheet as CSSStyleSheet | null;
      const fromRules = sheet ? Array.from(sheet.cssRules).map((rule) => rule.cssText) : [];
      return [tag.textContent ?? '', ...fromRules].join('\n');
    })
    .join('\n');
  const match = new RegExp(`\\.${cssClass}\\s+\\.euiTableRow\\[data-rule-id="([^"]+)"\\]`).exec(
    cssText
  );
  return match?.[1] ?? null;
};

describe('MigrationRulesTable', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        storage: createSecuritySolutionStorageMock().storage,
        siemMigrations: {
          rules: { getMissingCapabilities: jest.fn().mockReturnValue([]) },
        },
      },
    });
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
    (useGetMigrationRules as jest.Mock).mockReturnValue({
      data: { migrationRules: [], total: 0 },
      isLoading: false,
    });
    (useGetMigrationPrebuiltRules as jest.Mock).mockReturnValue({ data: {}, isLoading: false });
    (useGetMigrationTranslationStats as jest.Mock).mockReturnValue({
      data: mockTranslationStats,
      isLoading: false,
    });
    (useInstallMigrationRule as jest.Mock).mockReturnValue({ mutateAsync: jest.fn() });
    (useInstallMigrationRules as jest.Mock).mockReturnValue({ mutateAsync: jest.fn() });
    (useUpdateMigrationRule as jest.Mock).mockReturnValue({ mutateAsync: jest.fn() });
    (useUpdateIndexPattern as jest.Mock).mockReturnValue({ mutateAsync: jest.fn() });
    (useStartMigration as jest.Mock).mockReturnValue({
      startMigration: jest.fn(),
      isLoading: false,
    });
    (useBulkGetUserProfiles as jest.Mock).mockReturnValue({ isLoading: false, data: [] });
  });

  const renderTable = (migrationStats = mockMigrationStats) =>
    render(<MigrationRulesTable migrationStats={migrationStats} />, { wrapper: TestProviders });

  test('should render the skeleton while loading stats', () => {
    const { getByTestId } = renderTable();

    expect(getByTestId('migrationRulesTableSkeleton')).toBeInTheDocument();
  });

  test('should render the empty component when there are no rules', () => {
    (useGetMigrationTranslationStats as jest.Mock).mockReturnValue({
      data: {
        ...mockTranslationStats,
        rules: {
          total: 0,
          success: {
            total: 0,
            result: {
              full: 0,
              partial: 0,
              untranslatable: 0,
            },
            installable: 0,
            prebuilt: 0,
            missing_index: 0,
          },
          failed: 0,
        },
      },
      isLoading: false,
    });

    const { getByTestId } = renderTable();

    expect(getByTestId('emptyMigrationContainer')).toBeInTheDocument();
  });

  test('should render the table with rules', async () => {
    (useGetMigrationRules as jest.Mock).mockReturnValue({
      data: { migrationRules: [mockRule], total: 1 },
      isLoading: false,
    });
    const { getByTestId } = renderTable();

    expect(getByTestId('siemMigrationsRulesTable')).toBeInTheDocument();
  });

  describe('Table results', () => {
    beforeEach(() => {
      (useGetMigrationRules as jest.Mock).mockReturnValue({
        data: { migrationRules: rules, total: rules.length },
        isLoading: false,
      });
      (useGetMigrationTranslationStats as jest.Mock).mockReturnValue({
        data: getRuleMigrationTranslationStatsMock({
          rules: {
            total: 4,
            success: {
              total: 3,
              result: { full: 1, partial: 2, untranslatable: 0 },
              installable: 1,
              prebuilt: 0,
              missing_index: 0,
            },
            failed: 1,
          },
        }),
        isLoading: false,
      });
    });

    test('should render correct number of QRadar migration rule rows', () => {
      renderTable(getRuleMigrationStatsMock({ vendor: MigrationSource.QRADAR }));

      expect(screen.getByTestId('rules-translation-table')).toBeInTheDocument();
      const rows = screen.getByTestId('rules-translation-table').querySelectorAll('.euiTableRow');
      expect(rows).toHaveLength(4);
    });

    test('should render correct translation status for each QRadar rule', () => {
      renderTable(getRuleMigrationStatsMock({ vendor: MigrationSource.QRADAR }));

      expect(screen.getAllByTestId('translationStatus-partial')).toHaveLength(2);
      expect(screen.getAllByTestId('translationStatus-full')).toHaveLength(1);
      expect(screen.getAllByTestId('translationStatus-failed')).toHaveLength(1);
    });
  });

  describe('navigation', () => {
    const mockInstallMutate = jest.fn().mockResolvedValue({ installed: 1 });

    beforeEach(() => {
      (useGetMigrationRules as jest.Mock).mockReturnValue({
        data: { migrationRules: threeRules, total: threeRules.length },
        isLoading: false,
      });
      (useGetMigrationTranslationStats as jest.Mock).mockReturnValue({
        data: getRuleMigrationTranslationStatsMock({
          rules: {
            total: 3,
            success: {
              total: 3,
              result: { full: 2, partial: 0, untranslatable: 1 },
              installable: 2,
              prebuilt: 0,
              missing_index: 0,
            },
            failed: 0,
          },
        }),
        isLoading: false,
      });
      (useInstallMigrationRule as jest.Mock).mockReturnValue({ mutateAsync: mockInstallMutate });
    });

    it('should open the details flyout for the clicked rule', () => {
      renderTable();
      openFlyoutForRule('First Rule');

      expect(screen.getByTestId('ruleMigrationDetailsFlyout')).toBeInTheDocument();
      expect(screen.getByTestId('detailsFlyoutTitle')).toHaveTextContent('First Rule');
    });

    it('should show the next rule when the user navigates forward', () => {
      renderTable();
      openFlyoutForRule('First Rule');

      fireEvent.click(screen.getByTestId('flyoutPrevNextNavNextButton'));

      expect(screen.getByTestId('detailsFlyoutTitle')).toHaveTextContent('Second Rule');
    });

    it('should return to the previous rule when the user navigates backward', () => {
      renderTable();
      openFlyoutForRule('Second Rule');

      fireEvent.click(screen.getByTestId('flyoutPrevNextNavPreviousButton'));

      expect(screen.getByTestId('detailsFlyoutTitle')).toHaveTextContent('First Rule');
    });

    it('should disable the arrows at the page boundaries', () => {
      renderTable();
      openFlyoutForRule('First Rule');

      expect(screen.getByTestId('flyoutPrevNextNavPreviousButton')).toBeDisabled();
      expect(screen.getByTestId('flyoutPrevNextNavNextButton')).toBeEnabled();

      fireEvent.click(screen.getByTestId('flyoutPrevNextNavNextButton'));
      fireEvent.click(screen.getByTestId('flyoutPrevNextNavNextButton'));

      expect(screen.getByTestId('detailsFlyoutTitle')).toHaveTextContent('Third Rule');
      expect(screen.getByTestId('flyoutPrevNextNavNextButton')).toBeDisabled();
      expect(screen.getByTestId('flyoutPrevNextNavPreviousButton')).toBeEnabled();
    });

    it('should reset to the first enabled tab when navigating to a rule that cannot show the selected tab', () => {
      renderTable();
      openFlyoutForRule('First Rule');

      fireEvent.click(screen.getByTestId('tabOverview'));
      expect(screen.getByTestId('tabOverview')).toHaveAttribute('aria-selected', 'true');

      fireEvent.click(screen.getByTestId('flyoutPrevNextNavNextButton'));

      expect(screen.getByTestId('detailsFlyoutTitle')).toHaveTextContent('Second Rule');
      expect(screen.getByTestId('tabOverview')).toBeDisabled();
      expect(screen.getByTestId('tabOverview')).toHaveAttribute('aria-selected', 'false');
      expect(screen.getByTestId('tabTranslation')).toHaveAttribute('aria-selected', 'true');
    });

    it('should install the rule currently shown after navigating', () => {
      renderTable();
      openFlyoutForRule('First Rule');

      fireEvent.click(screen.getByTestId('flyoutPrevNextNavNextButton'));
      fireEvent.click(screen.getByTestId('flyoutPrevNextNavNextButton'));
      expect(screen.getByTestId('detailsFlyoutTitle')).toHaveTextContent('Third Rule');

      fireEvent.click(screen.getByTestId('installMigrationRuleFromFlyoutButton'));

      expect(mockInstallMutate).toHaveBeenCalledWith(
        expect.objectContaining({ migrationRule: expect.objectContaining({ id: 'rule-3' }) })
      );
    });

    it('should close the flyout when close button is clicked', () => {
      renderTable();
      openFlyoutForRule('First Rule');
      expect(screen.getByTestId('ruleMigrationDetailsFlyout')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('detailsFlyoutCloseButton'));
      expect(screen.queryByTestId('ruleMigrationDetailsFlyout')).not.toBeInTheDocument();
    });

    describe('failed rules', () => {
      const mockRulesWithFailed = (rulesWithFailed: RuleMigrationRule[], failedCount: number) => {
        (useGetMigrationRules as jest.Mock).mockReturnValue({
          data: { migrationRules: rulesWithFailed, total: rulesWithFailed.length },
          isLoading: false,
        });
        (useGetMigrationTranslationStats as jest.Mock).mockReturnValue({
          data: getRuleMigrationTranslationStatsMock({
            rules: {
              total: rulesWithFailed.length,
              success: {
                total: rulesWithFailed.length - failedCount,
                result: {
                  full: rulesWithFailed.length - failedCount,
                  partial: 0,
                  untranslatable: 0,
                },
                installable: rulesWithFailed.length - failedCount,
                prebuilt: 0,
                missing_index: 0,
              },
              failed: failedCount,
            },
          }),
          isLoading: false,
        });
      };

      it('should skip a failed rule when navigating forward and backward', () => {
        mockRulesWithFailed(
          [
            makeTranslatedRule('rule-1', 'First Rule'),
            makeFailedRule('rule-2', 'Failed Rule'),
            makeTranslatedRule('rule-3', 'Third Rule'),
          ],
          1
        );
        renderTable();
        openFlyoutForRule('First Rule');
        expect(getHighlightedRuleId()).toBe('rule-1');

        fireEvent.click(screen.getByTestId('flyoutPrevNextNavNextButton'));
        expect(screen.getByTestId('detailsFlyoutTitle')).toHaveTextContent('Third Rule');
        expect(getHighlightedRuleId()).toBe('rule-3');

        fireEvent.click(screen.getByTestId('flyoutPrevNextNavPreviousButton'));
        expect(screen.getByTestId('detailsFlyoutTitle')).toHaveTextContent('First Rule');
        expect(getHighlightedRuleId()).toBe('rule-1');
      });

      it('should disable both arrows when only failed rules surround the opened rule', () => {
        mockRulesWithFailed(
          [
            makeFailedRule('rule-1', 'Failed Rule One'),
            makeTranslatedRule('rule-2', 'Middle Rule'),
            makeFailedRule('rule-3', 'Failed Rule Two'),
          ],
          2
        );
        renderTable();
        openFlyoutForRule('Middle Rule');

        expect(screen.getByTestId('flyoutPrevNextNavPreviousButton')).toBeDisabled();
        expect(screen.getByTestId('flyoutPrevNextNavNextButton')).toBeDisabled();
        expect(getHighlightedRuleId()).toBe('rule-2');
      });
    });
  });

  describe('Add to chat tour', () => {
    const TOUR_STORAGE_KEY = NEW_FEATURES_TOUR_STORAGE_KEYS.SIEM_MIGRATIONS_RULES_ADD_TO_CHAT_TOUR;
    const step = (stepNumber: number) => `siemMigrationsAddToChatTour-step${stepNumber}`;
    // EuiTourStep resolves its anchor on the next tick; flush it before asserting absence.
    const flushTour = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

    const agentBuilderEnabledStore = createMockStore({
      ...mockGlobalState,
      app: {
        ...mockGlobalState.app,
        enableExperimental: {
          ...allowedExperimentalValues,
          siemRuleMigrationsAgentBuilderEnabled: true,
        },
      },
    });

    const mockOpenChat = jest.fn();
    const mockUiSettingsGet = jest.fn();
    const mockIsToursEnabled = jest.fn();
    let storage: Storage;
    let services: StartServices;

    // Mocks stop at Kibana services; security_solution hooks and components run for real.
    const createTourServices = (): StartServices => {
      const baseServices = createStartServicesMock();
      return {
        ...baseServices,
        siemMigrations: { rules: { getMissingCapabilities: jest.fn().mockReturnValue([]) } },
        application: {
          ...baseServices.application,
          capabilities: {
            ...baseServices.application.capabilities,
            [AGENTBUILDER_FEATURE_ID]: { show: true },
          },
        },
        settings: {
          ...baseServices.settings,
          client: {
            ...baseServices.settings.client,
            get: jest.fn().mockReturnValue(AIChatExperience.Agent),
            get$: jest.fn().mockReturnValue(of(AIChatExperience.Agent)),
          },
        },
        uiSettings: {
          ...baseServices.uiSettings,
          isDeclared: jest.fn().mockReturnValue(true),
          get: mockUiSettingsGet,
          getAll: jest.fn().mockReturnValue({}),
        },
        storage,
        notifications: { ...baseServices.notifications, tours: { isEnabled: mockIsToursEnabled } },
        agentBuilder: { openChat: mockOpenChat },
        telemetry: { ...baseServices.telemetry, reportEvent: jest.fn() },
      } as unknown as StartServices;
    };

    const mockRules = (rulesOnPage: RuleMigrationRule[], isLoading = false) =>
      (useGetMigrationRules as jest.Mock).mockReturnValue({
        data: { migrationRules: rulesOnPage, total: rulesOnPage.length },
        isLoading,
      });

    const tourTable = <MigrationRulesTable migrationStats={mockMigrationStats} />;
    const renderTourTable = () =>
      render(tourTable, {
        wrapper: ({ children }) => (
          <TestProviders store={agentBuilderEnabledStore} startServices={services}>
            {children}
          </TestProviders>
        ),
      });

    beforeEach(() => {
      ({ storage } = createSecuritySolutionStorageMock());
      mockUiSettingsGet.mockImplementation((key: string) =>
        key === DEFAULT_INDEX_KEY ? ['logs-*'] : true
      );
      mockIsToursEnabled.mockReturnValue(true);
      services = createTourServices();
      (useKibana as jest.Mock).mockReturnValue({ services });
      licenseService.start(of(licenseMock.createLicense({ license: { type: 'enterprise' } })));
      mockRules(threeRules);
    });

    afterEach(() => {
      licenseService.stop();
    });

    it('should explain the Add to chat button as the first step', async () => {
      renderTourTable();
      expect(await screen.findByTestId(step(1))).toHaveTextContent(
        'Chat with the AI Agent about your rules'
      );
    });

    it('should move to the rule step after Next', async () => {
      renderTourTable();
      fireEvent.click(await screen.findByTestId(`${step(1)}-next`));
      expect(await screen.findByTestId(step(2))).toHaveTextContent('Review a single rule');
    });

    it('should open the first eligible rule when Open rule is clicked', async () => {
      renderTourTable();
      fireEvent.click(await screen.findByTestId(`${step(1)}-next`));
      fireEvent.click(await screen.findByTestId(`${step(2)}-next`));
      expect(screen.getByTestId('detailsFlyoutTitle')).toHaveTextContent('First Rule');
    });

    it('should explain the rule details Add to chat button as the last step', async () => {
      renderTourTable();
      fireEvent.click(await screen.findByTestId(`${step(1)}-next`));
      fireEvent.click(await screen.findByTestId(`${step(2)}-next`));
      expect(await screen.findByTestId(step(3))).toHaveTextContent('Chat about this rule');
    });

    it('should jump to the last step when the user opens an eligible rule', async () => {
      renderTourTable();
      await screen.findByTestId(step(1));
      openFlyoutForRule('Third Rule');
      expect(await screen.findByTestId(step(3))).toBeInTheDocument();
    });

    it('should resume a saved last step at the rule step when no rule details are open', async () => {
      storage.set(TOUR_STORAGE_KEY, { isTourActive: true, currentTourStep: 3 });
      renderTourTable();
      expect(await screen.findByTestId(step(2))).toBeInTheDocument();
    });

    it.each([
      [
        'Finish',
        async () => {
          fireEvent.click(await screen.findByTestId(`${step(1)}-next`));
          fireEvent.click(await screen.findByTestId(`${step(2)}-next`));
          fireEvent.click(await screen.findByTestId(`${step(3)}-finish`));
        },
      ],
      [
        'Skip tour',
        async () => {
          fireEvent.click(await screen.findByTestId(`${step(1)}-skip`));
        },
      ],
      [
        'Add to chat',
        async () => {
          await screen.findByTestId(step(1));
          fireEvent.click(screen.getByTestId('newAgentBuilderAttachment'));
        },
      ],
    ])('should not show the tour again after %s', async (_, endTour) => {
      const { unmount } = renderTourTable();
      await endTour();
      unmount();

      renderTourTable();
      await flushTour();
      expect(screen.queryByTestId(step(1))).not.toBeInTheDocument();
    });

    it('should open the chat when Add to chat is clicked during the tour', async () => {
      renderTourTable();
      await screen.findByTestId(step(1));
      fireEvent.click(screen.getByTestId('newAgentBuilderAttachment'));
      expect(mockOpenChat).toHaveBeenCalledTimes(1);
    });

    const makeInstalledRule = (id: string, title: string): RuleMigrationRule => ({
      ...makeTranslatedRule(id, title),
      elastic_rule: { title, id: `installed-${id}` },
    });

    it.each([
      ['not translated', makeUntranslatableRule('rule-2', 'Second Rule')],
      ['failed', makeFailedRule('rule-4', 'Failed Rule')],
      ['installed', makeInstalledRule('rule-5', 'Installed Rule')],
    ])('should not start when the only rule on the page is %s', async (_, rule) => {
      mockRules([rule]);
      renderTourTable();
      await flushTour();
      expect(screen.queryByTestId(step(1))).not.toBeInTheDocument();
    });

    it('should start once an eligible rule appears on the page', async () => {
      mockRules([makeUntranslatableRule('rule-2', 'Second Rule')]);
      const { rerender } = renderTourTable();
      await flushTour();

      mockRules(threeRules);
      rerender(<MigrationRulesTable migrationStats={{ ...mockMigrationStats }} />);
      expect(await screen.findByTestId(step(1))).toBeInTheDocument();
    });

    it('should not start when Add to chat is disabled', async () => {
      mockUiSettingsGet.mockImplementation((key: string) =>
        key === DEFAULT_INDEX_KEY ? ['logs-*'] : false
      );
      renderTourTable();
      await flushTour();
      expect(screen.queryByTestId(step(1))).not.toBeInTheDocument();
    });

    it('should not start while announcements are disabled', async () => {
      mockIsToursEnabled.mockReturnValue(false);
      renderTourTable();
      await flushTour();
      expect(screen.queryByTestId(step(1))).not.toBeInTheDocument();
    });

    it('should not start while the table is loading', async () => {
      mockRules(threeRules, true);
      renderTourTable();
      await flushTour();
      expect(screen.queryByTestId(step(1))).not.toBeInTheDocument();
    });

    it('should show the last step for a not translated rule that has Add to chat', async () => {
      renderTourTable();
      await screen.findByTestId(step(1));
      openFlyoutForRule('Second Rule');
      expect(await screen.findByTestId(step(3))).toBeInTheDocument();
    });

    it('should return to the rule step when rule details are closed during the last step', async () => {
      renderTourTable();
      await screen.findByTestId(step(1));
      openFlyoutForRule('First Rule');
      await screen.findByTestId(step(3));

      fireEvent.click(screen.getByTestId('detailsFlyoutCloseButton'));
      expect(await screen.findByTestId(step(2))).toBeInTheDocument();
    });

    it('should hide the tour while the missing index pattern flyout is open', async () => {
      renderTourTable();
      await screen.findByTestId(step(1));
      fireEvent.click(screen.getByTestId('updateMissingIndexPatternButton'));
      await flushTour();
      expect(screen.queryByTestId(step(1))).not.toBeInTheDocument();
    });

    it('should keep the tour for a later visit when Add to chat is clicked while no step is showing', async () => {
      mockIsToursEnabled.mockReturnValue(false);
      const { unmount } = renderTourTable();
      fireEvent.click(await screen.findByTestId('newAgentBuilderAttachment'));
      unmount();

      mockIsToursEnabled.mockReturnValue(true);
      renderTourTable();
      expect(await screen.findByTestId(step(1))).toBeInTheDocument();
    });
  });
});
