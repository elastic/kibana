/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import rison from '@kbn/rison';
import type { ApplicationStart, HttpStart } from '@kbn/core/public';
import type {
  RuleGroup,
  RuleGroupConditions,
  RuleGroupDefinition,
} from '../../../common/api/detection_engine/rule_groups';
import { RULE_GROUPS_URL } from '../../../common/api/detection_engine/rule_groups';
import { URL_PARAM_KEY } from '../../common/hooks/constants';
import { describeConditionParts } from '../../detection_engine/rule_groups/components/condition_labels';
import { notifyRuleSetCreated } from '../../detection_engine/rule_groups/rule_set_events';

export interface RuleSetSuggestion {
  name: string;
  reason: string;
  conditions: RuleGroupConditions;
  rules_count: number;
  existing_rule_set?: { id: string; name: string };
}

interface RuleSetCardProps {
  suggestion: RuleSetSuggestion;
  http: HttpStart;
  application: ApplicationStart;
  canEditRules: boolean;
}

const RULES_PAGE_PATH = '/rules/management';

const CREATE = i18n.translate('xpack.securitySolution.agentBuilder.ruleSetAttachment.create', {
  defaultMessage: 'Create rule set',
});
const OPEN = i18n.translate('xpack.securitySolution.agentBuilder.ruleSetAttachment.open', {
  defaultMessage: 'Open rule set',
});
const NO_PRIVILEGES = i18n.translate(
  'xpack.securitySolution.agentBuilder.ruleSetAttachment.noPrivileges',
  { defaultMessage: 'You need the "All" privilege for rules to create rule sets.' }
);
const CREATED = i18n.translate('xpack.securitySolution.agentBuilder.ruleSetAttachment.created', {
  defaultMessage: 'Created in My rule sets',
});
const rulesCountLabel = (count: number) =>
  i18n.translate('xpack.securitySolution.agentBuilder.ruleSetAttachment.rulesCount', {
    defaultMessage: '{count, plural, one {# rule} other {# rules}}',
    values: { count },
  });
const alreadyExists = (name: string) =>
  i18n.translate('xpack.securitySolution.agentBuilder.ruleSetAttachment.alreadyExists', {
    defaultMessage: 'Already exists as "{name}"',
    values: { name },
  });
const createError = (message: string) =>
  i18n.translate('xpack.securitySolution.agentBuilder.ruleSetAttachment.createError', {
    defaultMessage: 'Could not create the rule set: {message}',
    values: { message },
  });

/** A rule set that the agent suggests. Only the user creates it, and it starts as private. */
export const RuleSetCard = ({ suggestion, http, application, canEditRules }: RuleSetCardProps) => {
  const {
    name,
    reason,
    conditions,
    rules_count: rulesCount,
    existing_rule_set: existing,
  } = suggestion;
  const [created, setCreated] = useState<RuleGroup>();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  const openRuleSet = (id: string) => {
    // On the rules page the page selects the set itself; elsewhere go to the page with the set open.
    notifyRuleSetCreated(id);
    if (!window.location.pathname.includes(RULES_PAGE_PATH)) {
      application.navigateToApp('securitySolutionUI', {
        path: `${RULES_PAGE_PATH}?${URL_PARAM_KEY.rulesTable}=${rison.encode({ ruleGroupId: id })}`,
      });
    }
  };

  const create = async () => {
    setIsSaving(true);
    setError(undefined);
    try {
      const definition: RuleGroupDefinition = {
        name,
        description: reason,
        visibility: 'private',
        conditions,
        included_rule_ids: [],
        excluded_rule_ids: [],
      };
      const ruleSet = await http.fetch<RuleGroup>(RULE_GROUPS_URL, {
        method: 'POST',
        version: '1',
        body: JSON.stringify(definition),
      });
      setCreated(ruleSet);
      openRuleSet(ruleSet.id);
    } catch (e) {
      setError(createError(e.body?.message ?? e.message));
    } finally {
      setIsSaving(false);
    }
  };

  const target = created ?? existing;

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="ruleSetSuggestionCard">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="folder" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem css={{ minWidth: 0 }}>
          <EuiTitle size="xxs">
            <h4 className="eui-textTruncate" title={name}>
              {name}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{rulesCountLabel(rulesCount)}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        {reason}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
        {describeConditionParts(conditions).map((part) => (
          <EuiFlexItem grow={false} key={part}>
            <EuiBadge color="default">{part}</EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        {target ? (
          <>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color={created ? 'success' : 'subdued'}>
                {created ? (
                  <>
                    <EuiIcon type="check" aria-hidden={true} /> {CREATED}
                  </>
                ) : (
                  alreadyExists(target.name)
                )}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType="chevronSingleRight"
                iconSide="right"
                onClick={() => openRuleSet(target.id)}
                data-test-subj="ruleSetSuggestionOpen"
              >
                {OPEN}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </>
        ) : (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={canEditRules ? undefined : NO_PRIVILEGES}>
              <EuiButton
                size="s"
                fill
                iconType="plus"
                isLoading={isSaving}
                isDisabled={!canEditRules}
                onClick={create}
                data-test-subj="ruleSetSuggestionCreate"
              >
                {CREATE}
              </EuiButton>
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {error && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="danger">
            {error}
          </EuiText>
        </>
      )}
    </EuiPanel>
  );
};
