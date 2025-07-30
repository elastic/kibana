/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination, EuiTableSelectionType } from '@elastic/eui';
import {
  EuiSkeletonLoading,
  EuiSkeletonTitle,
  EuiSkeletonText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiBasicTable,
  EuiButton,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import type { RuleMigrationFilters } from '../../../../../common/siem_migrations/types';
import { useIsOpenState } from '../../../../common/hooks/use_is_open_state';
import type { RelatedIntegration, RuleResponse } from '../../../../../common/api/detection_engine';
import { isMigrationPrebuiltRule } from '../../../../../common/siem_migrations/rules/utils';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { type RuleMigrationRule } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { EmptyMigration } from './empty_migration';
import { useMigrationRulesTableColumns } from '../../hooks/use_migration_rules_table_columns';
import { useMigrationRuleDetailsFlyout } from '../../hooks/use_migration_rule_preview_flyout';
import { useInstallMigrationRule } from '../../logic/use_install_migration_rule';
import { useInstallMigrationRules } from '../../logic/use_install_migration_rules';
import { useGetMigrationRules } from '../../logic/use_get_migration_rules';
import { useGetMigrationTranslationStats } from '../../logic/use_get_migration_translation_stats';
import { useGetMigrationPrebuiltRules } from '../../logic/use_get_migration_prebuilt_rules';
import * as logicI18n from '../../logic/translations';
import { BulkActions } from './bulk_actions';
import { SearchField } from './search_field';
import {
  RuleTranslationResult,
  SiemMigrationRetryFilter,
} from '../../../../../common/siem_migrations/constants';
import * as i18n from './translations';
import { useStartMigration } from '../../service/hooks/use_start_migration';
import type { FilterOptions, RuleMigrationSettings, RuleMigrationStats } from '../../types';
import { MigrationRulesFilter } from './filters';
import { convertFilterOptions } from './utils/filters';
import { SiemTranslatedRulesTour } from '../tours/translation_guide';
import { StartRuleMigrationModal } from './start_rule_migration_modal';

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORT_FIELD = 'translation_result';
const DEFAULT_SORT_DIRECTION = 'desc';

export interface MigrationRulesTableProps {
  /**
   * Re-fetches latest rule migration data
   */
  refetchData?: () => void;

  /**
   * Existing integrations.
   */
  integrations?: Record<string, RelatedIntegration>;

  /**
   * Indicates whether the integrations loading is in progress.
   */
  isIntegrationsLoading?: boolean;

  /**
   * migration stats
   */
  migrationStats: RuleMigrationStats;
}

/**
 * Table Component for displaying SIEM rules migrations
 */
export const MigrationRulesTable: React.FC<MigrationRulesTableProps> = React.memo(
  ({ refetchData, integrations, isIntegrationsLoading, migrationStats }) => {
    const migrationId = migrationStats.id;
    const { addError } = useAppToasts();

    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [sortField, setSortField] = useState<keyof RuleMigrationRule>(DEFAULT_SORT_FIELD);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(DEFAULT_SORT_DIRECTION);
    const [searchTerm, setSearchTerm] = useState<string | undefined>();

    // Filters
    const [filterOptions, setFilterOptions] = useState<FilterOptions | undefined>();

    const { data: translationStats, isLoading: isStatsLoading } =
      useGetMigrationTranslationStats(migrationId);

    const { data: prebuiltRules = {}, isLoading: isPrebuiltRulesLoading } =
      useGetMigrationPrebuiltRules(migrationId);

    const filters = useMemo<RuleMigrationFilters>(
      () => ({ searchTerm, ...convertFilterOptions(filterOptions) }),
      [searchTerm, filterOptions]
    );

    const {
      data: { migrationRules, total } = { migrationRules: [], total: 0 },
      isLoading: isDataLoading,
    } = useGetMigrationRules({
      migrationId,
      page: pageIndex,
      perPage: pageSize,
      sortField,
      sortDirection,
      filters,
    });

    const [selectedMigrationRules, setSelectedMigrationRules] = useState<RuleMigrationRule[]>([]);
    const tableSelection: EuiTableSelectionType<RuleMigrationRule> = useMemo(
      () => ({
        selectable: (item: RuleMigrationRule) => {
          return !item.elastic_rule?.id && item.translation_result === RuleTranslationResult.FULL;
        },
        selectableMessage: (selectable: boolean, item: RuleMigrationRule) => {
          if (selectable) {
            return '';
          }
          return item.elastic_rule?.id
            ? i18n.ALREADY_TRANSLATED_RULE_TOOLTIP
            : i18n.NOT_FULLY_TRANSLATED_RULE_TOOLTIP;
        },
        onSelectionChange: setSelectedMigrationRules,
        selected: selectedMigrationRules,
      }),
      [selectedMigrationRules]
    );

    const pagination = useMemo(() => {
      return {
        pageIndex,
        pageSize,
        totalItemCount: total,
      };
    }, [pageIndex, pageSize, total]);

    const sorting = useMemo(() => {
      return {
        sort: {
          field: sortField,
          direction: sortDirection,
        },
      };
    }, [sortDirection, sortField]);

    const onTableChange = useCallback(
      ({ page, sort }: CriteriaWithPagination<RuleMigrationRule>) => {
        if (page) {
          setPageIndex(page.index);
          setPageSize(page.size);
        }
        if (sort) {
          const { field, direction } = sort;
          setSortField(field);
          setSortDirection(direction);
        }
      },
      []
    );

    const handleOnSearch = useCallback((value: string) => {
      setSearchTerm(value.trim());
    }, []);

    const { mutateAsync: installMigrationRule } = useInstallMigrationRule(migrationId);
    const { mutateAsync: installMigrationRules } = useInstallMigrationRules(
      migrationId,
      translationStats
    );
    const { startMigration, isLoading: isRetryLoading } = useStartMigration(refetchData);

    const [isTableLoading, setTableLoading] = useState(false);
    const installSingleRule = useCallback(
      async (migrationRule: RuleMigrationRule, enabled?: boolean) => {
        setTableLoading(true);
        try {
          await installMigrationRule({ migrationRule, enabled });
        } catch (error) {
          addError(error, { title: logicI18n.INSTALL_MIGRATION_RULES_FAILURE });
        } finally {
          setTableLoading(false);
        }
      },
      [addError, installMigrationRule]
    );

    const installSelectedRule = useCallback(
      async (enabled?: boolean) => {
        setTableLoading(true);
        try {
          await installMigrationRules({
            ids: selectedMigrationRules.map((rule) => rule.id),
            enabled,
          });
        } catch (error) {
          addError(error, { title: logicI18n.INSTALL_MIGRATION_RULES_FAILURE });
        } finally {
          setTableLoading(false);
          setSelectedMigrationRules([]);
        }
      },
      [addError, installMigrationRules, selectedMigrationRules]
    );

    const installTranslatedRules = useCallback(
      async (enabled?: boolean) => {
        setTableLoading(true);
        try {
          await installMigrationRules({ enabled });
        } catch (error) {
          addError(error, { title: logicI18n.INSTALL_MIGRATION_RULES_FAILURE });
        } finally {
          setTableLoading(false);
        }
      },
      [addError, installMigrationRules]
    );

    const reprocessFailedRulesWithSettings = useCallback(
      (settings: RuleMigrationSettings) => {
        startMigration(migrationId, SiemMigrationRetryFilter.FAILED, settings);
      },
      [migrationId, startMigration]
    );

    const defaultSettingsForModal = useMemo(
      () => ({
        connectorId: migrationStats?.last_execution?.connector_id,
        skipPrebuiltRulesMatching: migrationStats?.last_execution?.skip_prebuilt_rules_matching,
      }),
      [migrationStats.last_execution]
    );

    const {
      isOpen: isReprocessFailedRulesModalVisible,
      open: showReprocessFailedRulesModal,
      close: closeReprocessFailedRulesModal,
    } = useIsOpenState(false);

    const isRulesLoading =
      isPrebuiltRulesLoading || isDataLoading || isTableLoading || isRetryLoading;

    const ruleActionsFactory = useCallback(
      (migrationRule: RuleMigrationRule, closeRulePreview: () => void) => {
        const canMigrationRuleBeInstalled =
          !isRulesLoading &&
          !migrationRule.elastic_rule?.id &&
          migrationRule.translation_result === RuleTranslationResult.FULL;
        return (
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButton
                disabled={!canMigrationRuleBeInstalled}
                onClick={() => {
                  installSingleRule(migrationRule);
                  closeRulePreview();
                }}
                data-test-subj="installMigrationRuleFromFlyoutButton"
              >
                {i18n.INSTALL_WITHOUT_ENABLING_BUTTON_LABEL}
              </EuiButton>
            </EuiFlexItem>
            {isMigrationPrebuiltRule(migrationRule.elastic_rule) && (
              <EuiFlexItem>
                <EuiButton
                  disabled={!canMigrationRuleBeInstalled}
                  onClick={() => {
                    installSingleRule(migrationRule, true);
                    closeRulePreview();
                  }}
                  fill
                  data-test-subj="installAndEnableMigrationRuleFromFlyoutButton"
                >
                  {i18n.INSTALL_AND_ENABLE_BUTTON_LABEL}
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      },
      [installSingleRule, isRulesLoading]
    );

    const getMigrationRuleData = useCallback(
      (ruleId: string) => {
        if (!isRulesLoading && migrationRules.length) {
          const migrationRule = migrationRules.find((item) => item.id === ruleId);
          let matchedPrebuiltRule: RuleResponse | undefined;
          let relatedIntegrations: RelatedIntegration[] = [];
          if (migrationRule) {
            // Find matched prebuilt rule if any and prioritize its installed version
            const prebuiltRuleId = migrationRule.elastic_rule?.prebuilt_rule_id;
            const prebuiltRuleVersions = prebuiltRuleId ? prebuiltRules[prebuiltRuleId] : undefined;
            matchedPrebuiltRule = prebuiltRuleVersions?.current ?? prebuiltRuleVersions?.target;

            const integrationIds = migrationRule.elastic_rule?.integration_ids;
            if (integrations && integrationIds) {
              relatedIntegrations = integrationIds
                .map((integrationId) => integrations[integrationId])
                .filter((integration) => integration != null);
            }
          }
          return {
            migrationRule,
            matchedPrebuiltRule,
            relatedIntegrations,
            isIntegrationsLoading,
          };
        }
      },
      [integrations, isIntegrationsLoading, isRulesLoading, prebuiltRules, migrationRules]
    );

    const {
      migrationRuleDetailsFlyout: rulePreviewFlyout,
      openMigrationRuleDetails: openRulePreview,
    } = useMigrationRuleDetailsFlyout({
      isLoading: isRulesLoading,
      getMigrationRuleData,
      ruleActionsFactory,
    });

    const rulesColumns = useMigrationRulesTableColumns({
      disableActions: isTableLoading,
      openMigrationRuleDetails: openRulePreview,
      installMigrationRule: installSingleRule,
      getMigrationRuleData,
    });

    return (
      <>
        {isReprocessFailedRulesModalVisible && (
          <StartRuleMigrationModal
            defaultSettings={defaultSettingsForModal}
            onStartMigrationWithSettings={reprocessFailedRulesWithSettings}
            onClose={closeReprocessFailedRulesModal}
            numberOfRules={translationStats?.rules.failed ?? 0}
          />
        )}

        {!isStatsLoading && translationStats?.rules.total && <SiemTranslatedRulesTour />}

        <EuiSkeletonLoading
          isLoading={isStatsLoading}
          loadingContent={
            <>
              <EuiSkeletonTitle />
              <EuiSkeletonText />
            </>
          }
          loadedContent={
            !translationStats?.rules.total ? (
              <EmptyMigration />
            ) : (
              <>
                <EuiFlexGroup
                  data-test-subj="siemMigrationsRulesTable"
                  gutterSize="m"
                  justifyContent="flexEnd"
                  wrap
                >
                  <EuiFlexItem>
                    <SearchField initialValue={searchTerm} onSearch={handleOnSearch} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <MigrationRulesFilter
                      filterOptions={filterOptions}
                      onFilterOptionsChanged={setFilterOptions}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <BulkActions
                      isTableLoading={isRulesLoading}
                      numberOfFailedRules={translationStats.rules.failed}
                      numberOfTranslatedRules={translationStats.rules.success.installable}
                      numberOfSelectedRules={selectedMigrationRules.length}
                      installTranslatedRule={installTranslatedRules}
                      installSelectedRule={installSelectedRule}
                      reprocessFailedRules={showReprocessFailedRulesModal}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="m" />
                <EuiBasicTable<RuleMigrationRule>
                  loading={isTableLoading}
                  items={migrationRules}
                  pagination={pagination}
                  sorting={sorting}
                  onChange={onTableChange}
                  selection={tableSelection}
                  itemId={'id'}
                  data-test-subj={'rules-translation-table'}
                  columns={rulesColumns}
                />
              </>
            )
          }
        />
        {rulePreviewFlyout}
      </>
    );
  }
);
MigrationRulesTable.displayName = 'MigrationRulesTable';
