/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ClassicRuleAction, RuleMigration } from '@kbn/alerting-v2-plugin/public';
import type { ConnectorNames } from './action_summaries';
import { ActionPolicyList, ClassicActionList } from './action_summaries';

const ColumnTitle = ({ title, action }: { title: string; action?: ReactNode }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem>
      <EuiTitle size="xxs">
        <h3>{title}</h3>
      </EuiTitle>
    </EuiFlexItem>
    {action && <EuiFlexItem grow={false}>{action}</EuiFlexItem>}
  </EuiFlexGroup>
);

export const ActionsComparison = ({
  classicActions,
  migration,
  connectorNames,
  actionPolicyActions,
}: {
  classicActions: ClassicRuleAction[];
  migration?: RuleMigration;
  connectorNames: ConnectorNames;
  /** Rendered beside the action policies heading. */
  actionPolicyActions?: ReactNode;
}) => {
  const { euiTheme } = useEuiTheme();

  const gridCss = css`
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: ${euiTheme.size.xl};
    row-gap: ${euiTheme.size.m};
  `;

  const hasConvertedActions = Boolean(
    migration && (migration.actionPolicies.length || migration.skippedActions.length)
  );

  return (
    <div css={gridCss} data-test-subj="migrateRuleActionsComparison">
      <ColumnTitle
        title={i18n.translate('xpack.observabilityAlerting.migrateRule.actions.classicTitle', {
          defaultMessage: 'Classic actions',
        })}
      />
      <ColumnTitle
        title={i18n.translate('xpack.observabilityAlerting.migrateRule.actions.policiesTitle', {
          defaultMessage: 'Action policies',
        })}
        action={actionPolicyActions}
      />
      <ClassicActionList actions={classicActions} connectorNames={connectorNames} />
      {migration && hasConvertedActions ? (
        <ActionPolicyList
          actionPolicies={migration.actionPolicies}
          skippedActions={migration.skippedActions}
          connectorNames={connectorNames}
        />
      ) : (
        <EuiText size="s" color="subdued">
          <em>
            {i18n.translate('xpack.observabilityAlerting.migrateRule.actions.nothingToConvert', {
              defaultMessage: 'No actions to convert',
            })}
          </em>
        </EuiText>
      )}
    </div>
  );
};
