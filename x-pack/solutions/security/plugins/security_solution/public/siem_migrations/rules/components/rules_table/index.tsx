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

import type { RelatedIntegration, RuleResponse } from '../../../../../common/api/detection_engine';
import { isMigrationPrebuiltRule } from '../../../../../common/siem_migrations/rules/utils';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type { RuleMigration } from '../../../../../common/siem_migrations/model/rule_migration.gen';
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
import type { FilterOptions } from '../../types';
import { MigrationRulesFilter } from './filters';
import { convertFilterOptions } from './utils/filters';
import { SiemTranslatedRulesTour } from '../tours/translation_guide';

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORT_FIELD = 'translation_result';
const DEFAULT_SORT_DIRECTION = 'desc';

export interface MigrationRulesTableProps {
  /**
   * Selected rule migration id
   */
  migrationId: string;

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
}

/**
 * Table Component for displaying SIEM rules migrations
 */
export const MigrationRulesTable: React.FC<MigrationRulesTableProps> = React.memo(
  ({ migrationId, refetchData, integrations, isIntegrationsLoading }) => {
    const { addError } = useAppToasts();

    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [sortField, setSortField] = useState<keyof RuleMigration>(DEFAULT_SORT_FIELD);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(DEFAULT_SORT_DIRECTION);
    const [searchTerm, setSearchTerm] = useState<string | undefined>();

    // Filters
    const [filterOptions, setFilterOptions] = useState<FilterOptions | undefined>();

    const { data: translationStats, isLoading: isStatsLoading } =
      useGetMigrationTranslationStats(migrationId);

    const { data: prebuiltRules = {}, isLoading: isPrebuiltRulesLoading } =
      useGetMigrationPrebuiltRules(migrationId);

    const {
      data: { ruleMigrations, total } = { ruleMigrations: [], total: 0 },
      isLoading: isDataLoading,
    } = useGetMigrationRules({
      migrationId,
      page: pageIndex,
      perPage: pageSize,
      sortField,
      sortDirection,
      filters: {
        searchTerm,
        ...convertFilterOptions(filterOptions),
      },
    });

    const [selectedRuleMigrations, setSelectedRuleMigrations] = useState<RuleMigration[]>([]);
    const tableSelection: EuiTableSelectionType<RuleMigration> = useMemo(
      () => ({
        selectable: (item: RuleMigration) => {
          return !item.elastic_rule?.id && item.translation_result === RuleTranslationResult.FULL;
        },
        selectableMessage: (selectable: boolean, item: RuleMigration) => {
          if (selectable) {
            return '';
          }
          return item.elastic_rule?.id
            ? i18n.ALREADY_TRANSLATED_RULE_TOOLTIP
            : i18n.NOT_FULLY_TRANSLATED_RULE_TOOLTIP;
        },
        onSelectionChange: setSelectedRuleMigrations,
        selected: selectedRuleMigrations,
      }),
      [selectedRuleMigrations]
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

    const onTableChange = useCallback(({ page, sort }: CriteriaWithPagination<RuleMigration>) => {
      if (page) {
        setPageIndex(page.index);
        setPageSize(page.size);
      }
      if (sort) {
        const { field, direction } = sort;
        setSortField(field);
        setSortDirection(direction);
      }
    }, []);

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
      async (ruleMigration: RuleMigration, enabled?: boolean) => {
        setTableLoading(true);
        try {
          await installMigrationRule({ ruleMigration, enabled });
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
            ids: selectedRuleMigrations.map((rule) => rule.id),
            enabled,
          });
        } catch (error) {
          addError(error, { title: logicI18n.INSTALL_MIGRATION_RULES_FAILURE });
        } finally {
          setTableLoading(false);
          setSelectedRuleMigrations([]);
        }
      },
      [addError, installMigrationRules, selectedRuleMigrations]
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

    const reprocessFailedRules = useCallback(async () => {
      startMigration(migrationId, SiemMigrationRetryFilter.FAILED);
    }, [migrationId, startMigration]);

    const isRulesLoading =
      isPrebuiltRulesLoading || isDataLoading || isTableLoading || isRetryLoading;

    const ruleActionsFactory = useCallback(
      (ruleMigration: RuleMigration, closeRulePreview: () => void) => {
        const canMigrationRuleBeInstalled =
          !isRulesLoading &&
          !ruleMigration.elastic_rule?.id &&
          ruleMigration.translation_result === RuleTranslationResult.FULL;
        return (
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButton
                disabled={!canMigrationRuleBeInstalled}
                onClick={() => {
                  installSingleRule(ruleMigration);
                  closeRulePreview();
                }}
                data-test-subj="installMigrationRuleFromFlyoutButton"
              >
                {i18n.INSTALL_WITHOUT_ENABLING_BUTTON_LABEL}
              </EuiButton>
            </EuiFlexItem>
            {isMigrationPrebuiltRule(ruleMigration.elastic_rule) && (
              <EuiFlexItem>
                <EuiButton
                  disabled={!canMigrationRuleBeInstalled}
                  onClick={() => {
                    installSingleRule(ruleMigration, true);
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
        if (!isRulesLoading && ruleMigrations.length) {
          const ruleMigration = ruleMigrations.find((item) => item.id === ruleId);
          let matchedPrebuiltRule: RuleResponse | undefined;
          let relatedIntegrations: RelatedIntegration[] = [];
          if (ruleMigration) {
            // Find matched prebuilt rule if any and prioritize its installed version
            const prebuiltRuleId = ruleMigration.elastic_rule?.prebuilt_rule_id;
            const prebuiltRuleVersions = prebuiltRuleId ? prebuiltRules[prebuiltRuleId] : undefined;
            matchedPrebuiltRule = prebuiltRuleVersions?.current ?? prebuiltRuleVersions?.target;

            const integrationIds = ruleMigration.elastic_rule?.integration_ids;
            if (integrations && integrationIds) {
              relatedIntegrations = integrationIds
                .map((integrationId) => integrations[integrationId])
                .filter((integration) => integration != null);
            }
          }
          return { ruleMigration, matchedPrebuiltRule, relatedIntegrations, isIntegrationsLoading };
        }
      },
      [integrations, isIntegrationsLoading, isRulesLoading, prebuiltRules, ruleMigrations]
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
                <EuiFlexGroup gutterSize="m" justifyContent="flexEnd" wrap>
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
                      numberOfSelectedRules={selectedRuleMigrations.length}
                      installTranslatedRule={installTranslatedRules}
                      installSelectedRule={installSelectedRule}
                      reprocessFailedRules={reprocessFailedRules}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="m" />
                <EuiBasicTable<RuleMigration>
                  loading={isTableLoading}
                  items={ruleMigrations}
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
