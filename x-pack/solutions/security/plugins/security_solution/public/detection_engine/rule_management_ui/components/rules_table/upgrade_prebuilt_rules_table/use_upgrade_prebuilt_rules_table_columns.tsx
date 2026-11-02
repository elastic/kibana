/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n as i18nCore } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { RuleUpgradeEventTypes } from '../../../../../common/lib/telemetry/events/rule_upgrade/types';
import { ThreeWayDiffConflict } from '../../../../../../common/api/detection_engine';
import type { RuleUpgradeState } from '../../../../rule_management/model/prebuilt_rule_upgrade/rule_upgrade_state';
import { RulesTableEmptyColumnName } from '../rules_table_empty_column_name';
import { SHOW_RELATED_INTEGRATIONS_SETTING } from '../../../../../../common/constants';
import type { RuleSignatureId } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { PopoverItems } from '../../../../../common/components/popover_items';
import { useKibana, useUiSetting$ } from '../../../../../common/lib/kibana';
import { IntegrationsPopover } from '../../../../common/components/related_integrations/integrations_popover';
import { SeverityBadge } from '../../../../../common/components/severity_badge';
import * as i18n from '../../../../common/translations';
import type { Rule } from '../../../../rule_management/logic';
import { getNormalizedSeverity } from '../helpers';
import { buildMlLinkedJobUpgradeItems } from './use_ml_jobs_upgrade_modal/job_upgrade_items';
import type { UpgradePrebuiltRulesTableActions } from './upgrade_prebuilt_rules_table_context';
import { useUpgradePrebuiltRulesTableContext } from './upgrade_prebuilt_rules_table_context';
import { usePrebuiltRulesCustomizationStatus } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_customization_status';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';

const ML_JOB_UPDATES_ROW_WARNING_TOOLTIP = i18nCore.translate(
  'xpack.securitySolution.detectionEngine.rules.mlJobUpdatesRowWarningTooltip',
  {
    defaultMessage: 'This rule has associated ML jobs that also need to be updated.',
  }
);

export type TableColumn = EuiBasicTableColumn<RuleUpgradeState>;

interface RuleNameProps {
  name: string;
  ruleId: string;
}

const RuleName = ({ name, ruleId }: RuleNameProps) => {
  const {
    actions: { openRulePreview },
  } = useUpgradePrebuiltRulesTableContext();

  return (
    <EuiLink
      onClick={() => {
        openRulePreview(ruleId);
      }}
      data-test-subj="ruleName"
    >
      {name}
    </EuiLink>
  );
};

const RULE_NAME_COLUMN: TableColumn = {
  field: 'current_rule.name',
  name: i18n.COLUMN_RULE,
  render: (value: RuleUpgradeState['current_rule']['name'], ruleUpgradeState: RuleUpgradeState) => (
    <RuleName name={value} ruleId={ruleUpgradeState.rule_id} />
  ),
  sortable: true,
  truncateText: true,
  minWidth: '12em',
  width: '18em',
  align: 'left',
};

const TAGS_COLUMN: TableColumn = {
  field: 'current_rule.tags',
  name: <RulesTableEmptyColumnName name={i18n.COLUMN_TAGS} />,
  align: 'center',
  render: (tags: Rule['tags']) => {
    if (tags == null || tags.length === 0) {
      return null;
    }

    const renderItem = (tag: string, i: number) => (
      <EuiBadge color="hollow" key={`${tag}-${i}`} data-test-subj="tag">
        {tag}
      </EuiBadge>
    );
    return (
      <PopoverItems
        items={tags}
        popoverTitle={i18n.COLUMN_TAGS}
        popoverButtonTitle={tags.length.toString()}
        popoverButtonIcon="tag"
        dataTestPrefix="tags"
        renderItem={renderItem}
      />
    );
  },
  width: '65px',
  truncateText: true,
};

const INTEGRATIONS_COLUMN: TableColumn = {
  field: 'current_rule.related_integrations',
  name: <RulesTableEmptyColumnName name={i18n.COLUMN_INTEGRATIONS} />,
  align: 'center',
  render: (integrations: Rule['related_integrations']) => {
    if (integrations == null || integrations.length === 0) {
      return null;
    }

    return <IntegrationsPopover relatedIntegrations={integrations} />;
  },
  width: '70px',
  truncateText: true,
};

const MODIFIED_COLUMN: TableColumn = {
  field: 'current_rule.rule_source',
  name: <RulesTableEmptyColumnName name={i18n.COLUMN_MODIFIED} />,
  align: 'center',
  render: (ruleSource: Rule['rule_source']) => {
    if (
      ruleSource == null ||
      ruleSource.type === 'internal' ||
      (ruleSource.type === 'external' && ruleSource.is_customized === false)
    ) {
      return null;
    }

    return (
      <EuiToolTip content={i18n.MODIFIED_TOOLTIP}>
        <EuiBadge
          color="hollow"
          data-test-subj="upgradeRulesTableModifiedColumnBadge"
          aria-label={i18n.MODIFIED_LABEL}
          tabIndex={0}
        >
          {i18n.MODIFIED_LABEL}
        </EuiBadge>
      </EuiToolTip>
    );
  },
  width: '90px',
  truncateText: true,
};

const CONFLICT_COLUMN: TableColumn = {
  field: 'conflict',
  name: <RulesTableEmptyColumnName name={i18n.COLUMN_CONFLICT} />,
  align: 'center',
  render: (conflict: ThreeWayDiffConflict) => {
    switch (conflict) {
      case ThreeWayDiffConflict.SOLVABLE:
        return (
          <EuiToolTip content={i18n.SOLVABLE_CONFLICT_TOOLTIP}>
            <EuiBadge
              color="warning"
              data-test-subj="upgradeRulesTableSolvableConflictColumnBadge"
              aria-label={i18n.SOLVABLE_CONFLICT_LABEL}
              tabIndex={0}
            >
              {i18n.SOLVABLE_CONFLICT_LABEL}
            </EuiBadge>
          </EuiToolTip>
        );

      case ThreeWayDiffConflict.NON_SOLVABLE:
        return (
          <EuiToolTip content={i18n.NON_SOLVABLE_CONFLICT_TOOLTIP}>
            <EuiBadge
              color="danger"
              data-test-subj="upgradeRulesTableUnsolvableConflictColumnBadge"
              aria-label={i18n.NON_SOLVABLE_CONFLICT_LABEL}
              tabIndex={0}
            >
              {i18n.NON_SOLVABLE_CONFLICT_LABEL}
            </EuiBadge>
          </EuiToolTip>
        );
    }
  },
  width: '170px',
  truncateText: true,
};

const MlJobUpdateWarningIcon = ({ ruleId }: { ruleId: string }) => (
  <EuiToolTip content={ML_JOB_UPDATES_ROW_WARNING_TOOLTIP}>
    <EuiIcon
      type="warning"
      color="warning"
      tabIndex={0}
      data-test-subj={`upgradeRuleMlJobWarningIcon-${ruleId}`}
      aria-label={ML_JOB_UPDATES_ROW_WARNING_TOOLTIP}
    />
  </EuiToolTip>
);

const withOptionalMlWarning = (ruleId: string, action: React.ReactNode, showWarning: boolean) => {
  if (!showWarning) {
    return action;
  }

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" justifyContent="center" responsive={false}>
      <EuiFlexItem grow={false}>{action}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <MlJobUpdateWarningIcon ruleId={ruleId} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const createUpgradeButtonColumn = (
  upgradeRules: UpgradePrebuiltRulesTableActions['upgradeRules'],
  openRulePreview: UpgradePrebuiltRulesTableActions['openRulePreview'],
  loadingRules: RuleSignatureId[],
  isDisabled: boolean,
  isPrebuiltRulesCustomizationEnabled: boolean,
  telemetry: ReturnType<typeof useKibana>['services']['telemetry'],
  mlJobWarningRuleIds: Set<string>
): TableColumn => ({
  field: 'rule_id',
  name: <RulesTableEmptyColumnName name={i18n.UPDATE_RULE_BUTTON} />,
  render: (ruleId: RuleSignatureId, record) => {
    const isRuleUpgrading = loadingRules.includes(ruleId);
    const isDisabledByConflicts =
      isPrebuiltRulesCustomizationEnabled && record.hasUnresolvedConflicts;
    const showMlWarning = mlJobWarningRuleIds.has(ruleId);
    const isUpgradeButtonDisabled = isRuleUpgrading || isDisabled;
    const spinner = (
      <EuiLoadingSpinner
        size="s"
        data-test-subj={`upgradeSinglePrebuiltRuleButton-loadingSpinner-${ruleId}`}
      />
    );

    if (isDisabledByConflicts) {
      const reviewButton = (
        <EuiToolTip content={i18n.UPDATE_RULE_BUTTON_TOOLTIP_CONFLICTS}>
          <EuiButtonEmpty
            color="warning"
            size="s"
            disabled={isUpgradeButtonDisabled}
            onClick={() => openRulePreview(ruleId)}
            data-test-subj={`reviewSinglePrebuiltRuleButton-${ruleId}`}
          >
            {isRuleUpgrading ? spinner : i18n.REVIEW_RULE_BUTTON}
          </EuiButtonEmpty>
        </EuiToolTip>
      );

      return withOptionalMlWarning(ruleId, reviewButton, showMlWarning);
    }

    const updateButton = (
      <EuiButtonEmpty
        size="s"
        disabled={isUpgradeButtonDisabled}
        onClick={() => {
          telemetry.reportEvent(RuleUpgradeEventTypes.RuleUpgradeSingleButtonClick, {
            hasBaseVersion: record.has_base_version === true,
          });
          upgradeRules([ruleId]);
        }}
        data-test-subj={`upgradeSinglePrebuiltRuleButton-${ruleId}`}
      >
        {isRuleUpgrading ? spinner : i18n.UPDATE_RULE_BUTTON}
      </EuiButtonEmpty>
    );

    return withOptionalMlWarning(ruleId, updateButton, showMlWarning);
  },
  width: '120px',
  align: 'center',
});

export const useUpgradePrebuiltRulesTableColumns = (): TableColumn[] => {
  const canEditRules = useUserPrivileges().rulesPrivileges.rules.edit;
  const [showRelatedIntegrations] = useUiSetting$<boolean>(SHOW_RELATED_INTEGRATIONS_SETTING);
  const {
    state: {
      loadingRules,
      isRefetching,
      isInitializingPrebuiltRulesPackage,
      ruleUpgradeStates,
    },
    actions: { upgradeRules, openRulePreview },
  } = useUpgradePrebuiltRulesTableContext();
  const isDisabled = isRefetching || isInitializingPrebuiltRulesPackage;
  const { isRulesCustomizationEnabled } = usePrebuiltRulesCustomizationStatus();
  const { telemetry } = useKibana().services;
  // Prototype: only the first 5 ML-linked upgrade examples show the row warning icon.
  const mlJobWarningRuleIds = useMemo(
    () =>
      new Set(
        buildMlLinkedJobUpgradeItems(ruleUpgradeStates)
          .slice(0, 5)
          .map((item) => item.ruleId)
      ),
    [ruleUpgradeStates]
  );

  return useMemo(
    () => [
      RULE_NAME_COLUMN,
      MODIFIED_COLUMN,
      ...(isRulesCustomizationEnabled ? [CONFLICT_COLUMN] : []),
      ...(showRelatedIntegrations ? [INTEGRATIONS_COLUMN] : []),
      TAGS_COLUMN,
      {
        field: 'current_rule.risk_score',
        name: i18n.COLUMN_RISK_SCORE,
        render: (value: Rule['risk_score']) => (
          <EuiText data-test-subj="riskScore" size="s">
            {value}
          </EuiText>
        ),
        sortable: true,
        truncateText: true,
        width: '85px',
      },
      {
        field: 'current_rule.severity',
        name: i18n.COLUMN_SEVERITY,
        render: (value: Rule['severity']) => <SeverityBadge value={value} />,
        sortable: ({ current_rule: { severity } }: RuleUpgradeState) =>
          getNormalizedSeverity(severity),
        truncateText: true,
        width: '100px',
      },
      ...(canEditRules
        ? [
            createUpgradeButtonColumn(
              upgradeRules,
              openRulePreview,
              loadingRules,
              isDisabled,
              isRulesCustomizationEnabled,
              telemetry,
              mlJobWarningRuleIds
            ),
          ]
        : []),
    ],
    [
      isRulesCustomizationEnabled,
      showRelatedIntegrations,
      canEditRules,
      upgradeRules,
      openRulePreview,
      loadingRules,
      isDisabled,
      telemetry,
      mlJobWarningRuleIds,
    ]
  );
};
