/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiDescriptionListProps } from '@elastic/eui';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { OriginalRuleQueryLanguage } from './get_original_rule_summary';
import { getOriginalRuleSummary } from './get_original_rule_summary';

export interface OriginalRule {
  name: string;
  tags: string[];
  enabled: boolean;
  schedule: { interval: string };
  params: Record<string, unknown>;
  alertDelay?: { active: number } | null;
  actions: unknown[];
}

const QUERY_LANGUAGE_LABELS: Record<OriginalRuleQueryLanguage, string> = {
  esql: i18n.translate('xpack.observabilityAlerting.migrateRule.originalRule.queryLanguage.esql', {
    defaultMessage: 'ES|QL',
  }),
  dsl: i18n.translate('xpack.observabilityAlerting.migrateRule.originalRule.queryLanguage.dsl', {
    defaultMessage: 'Query DSL',
  }),
  kql: i18n.translate('xpack.observabilityAlerting.migrateRule.originalRule.queryLanguage.kql', {
    defaultMessage: 'KQL',
  }),
  lucene: i18n.translate(
    'xpack.observabilityAlerting.migrateRule.originalRule.queryLanguage.lucene',
    { defaultMessage: 'Lucene' }
  ),
};

const CODE_BLOCK_LANGUAGES: Record<OriginalRuleQueryLanguage, string> = {
  esql: 'esql',
  dsl: 'json',
  kql: 'text',
  lucene: 'text',
};

export const OriginalRulePanel = ({ rule }: { rule: OriginalRule }) => {
  const { query, timeField, timeWindow } = useMemo(
    () => getOriginalRuleSummary(rule.params),
    [rule.params]
  );

  const listItems: EuiDescriptionListProps['listItems'] = [
    {
      title: i18n.translate('xpack.observabilityAlerting.migrateRule.originalRule.status', {
        defaultMessage: 'Status',
      }),
      description: rule.enabled
        ? i18n.translate('xpack.observabilityAlerting.migrateRule.originalRule.enabled', {
            defaultMessage: 'Enabled',
          })
        : i18n.translate('xpack.observabilityAlerting.migrateRule.originalRule.disabled', {
            defaultMessage: 'Disabled',
          }),
    },
    {
      title: i18n.translate('xpack.observabilityAlerting.migrateRule.originalRule.schedule', {
        defaultMessage: 'Runs every',
      }),
      description: rule.schedule.interval,
    },
    ...(timeWindow
      ? [
          {
            title: i18n.translate(
              'xpack.observabilityAlerting.migrateRule.originalRule.timeWindow',
              { defaultMessage: 'Time window' }
            ),
            description: timeWindow,
          },
        ]
      : []),
    ...(timeField
      ? [
          {
            title: i18n.translate(
              'xpack.observabilityAlerting.migrateRule.originalRule.timeField',
              { defaultMessage: 'Time field' }
            ),
            description: timeField,
          },
        ]
      : []),
    {
      title: i18n.translate('xpack.observabilityAlerting.migrateRule.originalRule.alertDelay', {
        defaultMessage: 'Alert after',
      }),
      description: i18n.translate(
        'xpack.observabilityAlerting.migrateRule.originalRule.alertDelayValue',
        {
          defaultMessage:
            '{count, plural, one {# consecutive match} other {# consecutive matches}}',
          values: { count: Math.max(rule.alertDelay?.active ?? 1, 1) },
        }
      ),
    },
    {
      title: i18n.translate('xpack.observabilityAlerting.migrateRule.originalRule.actions', {
        defaultMessage: 'Actions',
      }),
      description: String(rule.actions.length),
    },
  ];

  return (
    <div data-test-subj="migrateRuleOriginalRule">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.observabilityAlerting.migrateRule.originalRule.title', {
                defaultMessage: 'Original rule',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            {i18n.translate('xpack.observabilityAlerting.migrateRule.originalRule.classicBadge', {
              defaultMessage: 'Classic',
            })}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiText size="m">
        <strong data-test-subj="migrateRuleOriginalRuleName">{rule.name}</strong>
      </EuiText>
      {rule.tags.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiBadgeGroup gutterSize="xs">
            {rule.tags.map((tag) => (
              <EuiBadge key={tag} color="hollow">
                {tag}
              </EuiBadge>
            ))}
          </EuiBadgeGroup>
        </>
      )}
      <EuiSpacer size="m" />
      {query && (
        <>
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('xpack.observabilityAlerting.migrateRule.originalRule.query', {
                defaultMessage: 'Query ({language})',
                values: { language: QUERY_LANGUAGE_LABELS[query.language] },
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiCodeBlock
            language={CODE_BLOCK_LANGUAGES[query.language]}
            fontSize="s"
            paddingSize="s"
            isCopyable
            data-test-subj="migrateRuleOriginalRuleQuery"
          >
            {query.query}
          </EuiCodeBlock>
          <EuiSpacer size="m" />
        </>
      )}
      <EuiDescriptionList
        type="column"
        compressed
        listItems={listItems}
        data-test-subj="migrateRuleOriginalRuleDetails"
      />
    </div>
  );
};
