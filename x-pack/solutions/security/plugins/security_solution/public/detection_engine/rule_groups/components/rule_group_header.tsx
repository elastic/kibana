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
  EuiIcon,
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
import type { RuleGroup } from '../../../../common/api/detection_engine/rule_groups';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useRulesTableContext } from '../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { useRuleGroupOutcomesQuery, useRuleGroupsWithCountsQuery } from '../api';
import { useRuleGroupEditor } from './rule_group_editor_context';
import { groupColor } from './group_color';
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

/** Above the rules table when a rule group is selected: what the group is and how it is defined. */
export const RuleGroupHeader = () => {
  const {
    state: { filterOptions },
  } = useRulesTableContext();
  const { data } = useRuleGroupsWithCountsQuery();
  const { openEditor } = useRuleGroupEditor();
  const { euiTheme } = useEuiTheme();
  const canEditRules = useUserPrivileges().rulesPrivileges.rules.edit;
  const group: RuleGroup | undefined = data?.groups.find(
    ({ id }) => id === filterOptions.ruleGroupId
  );
  const { data: outcomes } = useRuleGroupOutcomesQuery(group?.id);
  const [{ tabName }] = useRouteSpy();
  const isMonitoring = tabName === AllRulesTabs.monitoring;

  if (!group) {
    return null;
  }

  return (
    <>
      <EuiPanel hasBorder paddingSize="m" data-test-subj="ruleGroupHeader">
        <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon
                  type="folderOpen"
                  size="l"
                  color={groupColor(group.id)}
                  aria-hidden={true}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h2>{group.name}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge
                  color="hollow"
                  iconType={group.visibility === 'private' ? 'lock' : 'users'}
                >
                  {group.visibility === 'private' ? i18n.PRIVATE_BADGE : i18n.SHARED_BADGE}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
            {group.description && (
              <EuiText size="xs" color="subdued">
                {group.description}
              </EuiText>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="l" responsive={false}>
              {isMonitoring ? (
                <>
                  <Stat
                    label={i18n.STAT_FAILED}
                    value={outcomes?.by_outcome.failed.total}
                    color={outcomes?.by_outcome.failed.total ? euiTheme.colors.danger : undefined}
                  />
                  <Stat label={i18n.STAT_WARNING} value={outcomes?.by_outcome.warning.total} />
                  <Stat
                    label={i18n.STAT_NO_RESPONSE}
                    value={
                      outcomes &&
                      outcomes.all.total -
                        outcomes.by_outcome.succeeded.total -
                        outcomes.by_outcome.warning.total -
                        outcomes.by_outcome.failed.total
                    }
                  />
                </>
              ) : (
                <>
                  <Stat label={i18n.STAT_RULES} value={group.rules_count} />
                  <Stat label={i18n.STAT_ENABLED} value={outcomes?.enabled.total} />
                  <Stat
                    label={i18n.STAT_FAILED}
                    value={group.failed_count}
                    color={group.failed_count ? euiTheme.colors.danger : undefined}
                  />
                </>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          {canEditRules && (
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                iconType="pencil"
                onClick={() => openEditor({ group })}
                data-test-subj="ruleGroupHeaderEdit"
              >
                {i18n.EDIT_GROUP}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        {group.rules_count === 0 && (
          <>
            <EuiSpacer size="m" />
            <KbnInfoCallout
              size="s"
              announceOnMount
              title={i18n.EMPTY_GROUP_TITLE}
              text={<p>{i18n.EMPTY_GROUP_BODY}</p>}
              data-test-subj="ruleGroupEmpty"
            />
          </>
        )}
      </EuiPanel>
      <EuiSpacer size="m" />
    </>
  );
};
