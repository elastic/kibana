/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { useRouteSpy } from '../../../common/utils/route/use_route_spy';
import { AllRulesTabs } from '../../rule_management_ui/components/rules_table/constants';
import type { RuleSetSummary } from '../../../../common/api/detection_engine/rule_sets';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useRulesTableContext } from '../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { useRuleSetOutcomesQuery, useRuleSetsWithCountsQuery } from '../api';
import { RuleSetMoreActions, RuleSetSwitcher, useSuggestRuleSets } from './rule_set_switcher';
import { RuleSetDefinitionLine } from './rules_group_by_control';
import * as i18n from './translations';

/** `value` is undefined while it loads: a 0 there would read as "the group is empty". */
const Stat = ({ label, value, color }: { label: string; value?: number; color?: string }) => (
  <EuiFlexItem grow={false}>
    <EuiText size="xs" color="subdued">
      {label}
    </EuiText>
    <EuiTitle size="xs">
      {value == null ? (
        <EuiLoadingSpinner size="m" />
      ) : (
        <span css={color ? { color } : undefined}>{value}</span>
      )}
    </EuiTitle>
  </EuiFlexItem>
);

/** Health of the selected set: run outcomes on the monitoring tab, size elsewhere. */
const RuleSetStats = ({ group }: { group: RuleSetSummary }) => {
  const { euiTheme } = useEuiTheme();
  const { data: outcomes } = useRuleSetOutcomesQuery(group.id);
  const [{ tabName }] = useRouteSpy();

  if (tabName === AllRulesTabs.monitoring) {
    const failed = outcomes?.by_outcome.failed.total;
    return (
      <EuiFlexGroup gutterSize="l" responsive={false}>
        <Stat
          label={i18n.STAT_FAILED}
          value={failed}
          color={failed ? euiTheme.colors.danger : undefined}
        />
        <Stat label={i18n.STAT_WARNING} value={outcomes?.by_outcome.warning.total} />
        <Stat
          label={i18n.STAT_NO_RESPONSE}
          value={
            outcomes &&
            outcomes.all.total -
              outcomes.by_outcome.succeeded.total -
              outcomes.by_outcome.warning.total -
              (failed ?? 0)
          }
        />
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup gutterSize="l" responsive={false}>
      <Stat label={i18n.STAT_RULES} value={group.rules_count} />
      <Stat label={i18n.STAT_ENABLED} value={outcomes?.enabled.total} />
      <Stat
        label={i18n.STAT_FAILED}
        value={group.failed_count}
        color={group.failed_count ? euiTheme.colors.danger : undefined}
      />
    </EuiFlexGroup>
  );
};

/** Above the rules table: the rule set switcher, and what the selected set is. */
export const RuleSetHeader = () => {
  const {
    state: { filterOptions },
  } = useRulesTableContext();
  const { data, isLoading } = useRuleSetsWithCountsQuery();
  const canEditRules = useUserPrivileges().rulesPrivileges.rules.edit;
  const suggestRuleSets = useSuggestRuleSets();
  const group: RuleSetSummary | undefined = data?.find(({ id }) => id === filterOptions.ruleSetId);
  const hasNoSets = !isLoading && data?.length === 0;

  return (
    <>
      <EuiPanel hasBorder paddingSize="s" data-test-subj="ruleSetHeader">
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem css={{ minWidth: 0 }}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
                <RuleSetSwitcher />
              </EuiFlexItem>
              {group && (
                <EuiFlexItem grow={false}>
                  <EuiBadge
                    color="hollow"
                    iconType={group.visibility === 'private' ? 'lock' : 'users'}
                  >
                    {group.visibility === 'private' ? i18n.PRIVATE_BADGE : i18n.SHARED_BADGE}
                  </EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            {group?.description && (
              <>
                <EuiSpacer size="xs" />
                <EuiText size="xs" color="subdued">
                  {group.description}
                </EuiText>
              </>
            )}
            {group && (
              <>
                <EuiSpacer size="xs" />
                <RuleSetDefinitionLine group={group} />
              </>
            )}
          </EuiFlexItem>
          {hasNoSets && suggestRuleSets && (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false} css={{ maxWidth: 480 }}>
                  <EuiText size="xs" color="subdued">
                    {i18n.SUGGEST_RULE_SETS_HELP}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    iconType="sparkles"
                    onClick={suggestRuleSets}
                    data-test-subj="ruleSetsSuggestEmptyButton"
                  >
                    {i18n.SUGGEST_RULE_SETS}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
          {group && (
            <EuiFlexItem grow={false}>
              <RuleSetStats group={group} />
            </EuiFlexItem>
          )}
          {group && canEditRules && (
            <EuiFlexItem grow={false}>
              <RuleSetMoreActions group={group} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        {group?.rules_count === 0 && (
          <>
            <EuiSpacer size="m" />
            <KbnInfoCallout
              size="s"
              announceOnMount
              title={i18n.EMPTY_GROUP_TITLE}
              text={<p>{i18n.EMPTY_GROUP_BODY}</p>}
              data-test-subj="ruleSetEmpty"
            />
          </>
        )}
      </EuiPanel>
      <EuiSpacer size="m" />
    </>
  );
};
