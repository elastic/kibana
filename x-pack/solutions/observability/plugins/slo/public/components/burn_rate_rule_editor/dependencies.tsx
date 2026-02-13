/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiTableActionsColumnType } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import React from 'react';
import { useFetchSLOsWithBurnRateRules } from '../../hooks/use_fetch_slos_with_burn_rate_rules';
import type { Dependency } from '../../../common/burn_rate_rule/types';
import {
  ALERT_ACTION,
  HIGH_PRIORITY_ACTION,
  LOW_PRIORITY_ACTION,
  MEDIUM_PRIORITY_ACTION,
} from '../../../common/constants';
import { DependencyEditor } from './dependency_editor';
import { TechnicalPreviewBadge } from '../technical_preview_badge';

const ACTION_GROUP_OPTIONS = [
  { value: ALERT_ACTION.id, label: ALERT_ACTION.name },
  { value: HIGH_PRIORITY_ACTION.id, label: HIGH_PRIORITY_ACTION.name },
  { value: MEDIUM_PRIORITY_ACTION.id, label: MEDIUM_PRIORITY_ACTION.name },
  { value: LOW_PRIORITY_ACTION.id, label: LOW_PRIORITY_ACTION.name },
];

interface DependenciesProps {
  currentRuleId?: string;
  dependencies: Dependency[];
  onChange: (depencencies: Dependency[]) => void;
}

interface DependencyTableRow {
  index: number;
  dependency: Dependency;
  actionGroupsToSuppressOn: string[];
}

export function Dependencies({ currentRuleId, dependencies, onChange }: DependenciesProps) {
  const { isLoading, data: allRules } = useFetchSLOsWithBurnRateRules({});

  const dependencyRuleIds = dependencies.map((dep) => dep.ruleId);
  const availableRules = currentRuleId
    ? allRules?.filter((rule) => rule.id !== currentRuleId && !dependencyRuleIds.includes(rule.id))
    : allRules;

  const handleAddDependency = (dependency: Dependency) => {
    onChange([...dependencies, dependency]);
  };

  const handleChange = (index: number, dependency: Dependency) => {
    onChange(dependencies.map((dep, idx) => (idx === index ? dependency : dep)));
  };

  const handleDelete = (index: number) => {
    onChange(dependencies.filter((_dep, idx) => idx !== index));
  };

  const rows = dependencies.map((dependency, index) => {
    const rule = allRules?.find(({ id }) => id === dependency.ruleId);
    return {
      index,
      name: rule?.name,
      actionGroupsToSuppressOn: dependency.actionGroupsToSuppressOn,
      dependency,
    };
  });

  const columns = [
    {
      field: 'name',
      truncateText: true,
      name: i18n.translate('xpack.slo.rules.dependencies.ruleColumn', {
        defaultMessage: 'Rule',
      }),
    },
    {
      field: 'actionGroupsToSuppressOn',
      name: i18n.translate('xpack.slo.rules.dependencies.supressOnColumn', {
        defaultMessage: 'Suppress on',
      }),
      render: (groups: string[]) => {
        return groups.map((group) => {
          const actionGroup = ACTION_GROUP_OPTIONS.find((g) => g.value === group);
          return <EuiBadge color="hollow">{actionGroup?.label}</EuiBadge>;
        });
      },
    },
    {
      width: '50px',
      actions: [
        {
          render: (row: DependencyTableRow) => {
            const handleSubmit = (dep: Dependency) => {
              handleChange(row.index, dep);
            };
            const selectedRule = allRules?.find(({ id }) => id === row.dependency.ruleId);
            return (
              <DependencyEditor
                isLoading={isLoading}
                onSubmit={handleSubmit}
                dependency={row.dependency}
                rules={
                  availableRules && selectedRule
                    ? [...availableRules, selectedRule]
                    : availableRules
                }
              />
            );
          },
        },
        {
          icon: 'trash',
          type: 'icon',
          color: 'danger',
          name: 'Delete',
          description: 'Delete dependency',
          onClick: (row: DependencyTableRow) => {
            handleDelete(row.index);
          },
        },
      ],
    } as EuiTableActionsColumnType<DependencyTableRow>,
  ];

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <EuiTitle size="xs">
            <h5>
              {i18n.translate('xpack.slo.rules.dependencies.title', {
                defaultMessage: 'Rule dependencies',
              })}
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={0}>
          <TechnicalPreviewBadge />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.slo.rules.dependencies.description', {
            defaultMessage:
              'Configure rule dependencies and designate the severity action groups you want to use to suppress the current rule. For instance, if you choose to suppress on the "Critical" and "High" action groups, the current rule will abstain from executing any actions of its severity groups when the associated rule dependency breaches its threshold. Instead, it will execute a "Suppressed" action group in response to the dependency trigger.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiBasicTable
        columns={columns}
        items={rows}
        tableCaption={i18n.translate('xpack.slo.rules.dependencies.tableCaption', {
          defaultMessage: 'Configured rule dependencies',
        })}
      />
      <EuiSpacer size="s" />
      <DependencyEditor
        rules={availableRules}
        isLoading={isLoading}
        onSubmit={handleAddDependency}
      />
      <EuiSpacer size="m" />
    </>
  );
}
