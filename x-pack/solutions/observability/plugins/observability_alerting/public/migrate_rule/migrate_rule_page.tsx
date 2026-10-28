/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  EuiCallOut,
  EuiPageHeader,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSteps,
} from '@elastic/eui';
import type { EuiStepStatus } from '@elastic/eui';
import type { ChromeBreadcrumb, HttpStart } from '@kbn/core/public';
import type { AlertingV2PublicStart } from '@kbn/alerting-v2-plugin/public';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/react-hooks';
import { resolveRule } from '@kbn/response-ops-rule-form';
import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '../constants';
import type { RuleFormStepId } from './rule_comparison';
import { RuleComparison } from './rule_comparison';
import { NewRuleActions } from './new_rule_actions';
import { ActionsComparison } from './actions_comparison';
import { CreateActionPoliciesButton } from './create_action_policies_button';

const CONNECTORS_API_PATH = '/api/actions/connectors';

const MIGRATE_RULE_TITLE = i18n.translate('xpack.observabilityAlerting.migrateRule.title', {
  defaultMessage: 'Migrate rule',
});

export interface MigrateRulePageProps {
  http: HttpStart;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  CreateRuleFlyout: AlertingV2PublicStart['CreateRuleFlyout'];
  migrateRule: AlertingV2PublicStart['migrateRule'];
  createMigratedRule: AlertingV2PublicStart['createMigratedRule'];
  createMigratedActionPolicies: AlertingV2PublicStart['createMigratedActionPolicies'];
  isMigratedActionPolicyReady: AlertingV2PublicStart['isMigratedActionPolicyReady'];
  onRuleCreated: () => void;
}

export const MigrateRulePage = ({
  http,
  setBreadcrumbs,
  CreateRuleFlyout,
  migrateRule,
  createMigratedRule,
  createMigratedActionPolicies,
  isMigratedActionPolicyReady,
  onRuleCreated,
}: MigrateRulePageProps) => {
  const { ruleId } = useParams<{ ruleId: string }>();
  const history = useHistory();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(true);
  const [stepRequest, setStepRequest] = useState<{ stepId: RuleFormStepId }>();
  const openFlyout = useCallback(() => {
    setStepRequest(undefined);
    setIsFlyoutOpen(true);
  }, []);
  const closeFlyout = useCallback(() => setIsFlyoutOpen(false), []);
  const editField = useCallback((stepId: RuleFormStepId) => {
    setStepRequest({ stepId });
    setIsFlyoutOpen(true);
  }, []);

  const {
    value: rule,
    loading,
    error,
  } = useAbortableAsync(() => resolveRule({ http, id: ruleId }), [http, ruleId]);

  const {
    value: migration,
    loading: migrationLoading,
    error: migrationError,
  } = useAbortableAsync(() => (rule ? migrateRule(rule) : undefined), [migrateRule, rule]);

  const { value: connectors } = useAbortableAsync(
    ({ signal }) => http.get<Array<{ id: string; name: string }>>(CONNECTORS_API_PATH, { signal }),
    [http]
  );
  const connectorNames = useMemo(
    () => new Map((connectors ?? []).map(({ id, name }) => [id, name])),
    [connectors]
  );

  const [isCreating, setIsCreating] = useState(false);
  const [createdRuleId, setCreatedRuleId] = useState<string>();
  const createRule = useCallback(async () => {
    if (!migration) return;
    setIsCreating(true);
    try {
      setCreatedRuleId(await createMigratedRule(migration.rule));
    } finally {
      setIsCreating(false);
    }
  }, [createMigratedRule, migration]);
  const viewCreatedRule = useCallback(() => {
    if (!createdRuleId) return;
    history.push(`${OBSERVABILITY_ALERTING_RULES_V2_PATH}/${encodeURIComponent(createdRuleId)}`);
  }, [history, createdRuleId]);

  const readyActionPolicyCount =
    migration?.actionPolicies.filter(isMigratedActionPolicyReady).length ?? 0;
  const [isCreatingPolicies, setIsCreatingPolicies] = useState(false);
  const [createdActionPolicyIds, setCreatedActionPolicyIds] = useState<string[]>();
  const createActionPolicies = useCallback(async () => {
    if (!migration) return;
    setIsCreatingPolicies(true);
    try {
      setCreatedActionPolicyIds(await createMigratedActionPolicies(migration.actionPolicies));
    } finally {
      setIsCreatingPolicies(false);
    }
  }, [createMigratedActionPolicies, migration]);
  const getActionsStepStatus = (): EuiStepStatus => {
    if (!createdRuleId) return 'incomplete';
    return createdActionPolicyIds ? 'complete' : 'current';
  };
  const actionsStepStatus = getActionsStepStatus();
  const viewActionPolicies = useCallback(
    () => history.push(OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH),
    [history]
  );

  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('xpack.observabilityAlerting.migrateRule.alertingBreadcrumb', {
          defaultMessage: 'Alerting',
        }),
      },
      {
        text: i18n.translate('xpack.observabilityAlerting.migrateRule.rulesBreadcrumb', {
          defaultMessage: 'Rules',
        }),
        href: OBSERVABILITY_ALERTING_RULES_V1_PATH,
      },
      { text: MIGRATE_RULE_TITLE },
    ]);
  }, [setBreadcrumbs]);

  return (
    <div data-test-subj="migrateRulePage" data-rule-id={ruleId}>
      <EuiPageHeader
        pageTitle={MIGRATE_RULE_TITLE}
        description={i18n.translate('xpack.observabilityAlerting.migrateRule.description', {
          defaultMessage:
            'Convert your classic rule into a Universal rule, then convert its actions into action policies.',
        })}
        bottomBorder
      />
      <EuiSpacer size="l" />
      {error ? (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="error"
          title={i18n.translate('xpack.observabilityAlerting.migrateRule.originalRule.loadError', {
            defaultMessage: 'Unable to load the original rule',
          })}
          data-test-subj="migrateRuleOriginalRuleError"
        >
          {error.message}
        </EuiCallOut>
      ) : loading || !rule ? (
        <EuiSkeletonText lines={8} data-test-subj="migrateRuleOriginalRuleLoading" />
      ) : (
        <EuiSteps
          headingElement="h2"
          steps={[
            {
              title: i18n.translate('xpack.observabilityAlerting.migrateRule.steps.convertRule', {
                defaultMessage: 'Convert rule',
              }),
              status: createdRuleId ? 'complete' : 'current',
              'data-test-subj': 'migrateRuleConvertRuleStep',
              children: (
                <EuiPanel hasBorder data-test-subj="migrateRuleComparisonPanel">
                  <RuleComparison
                    originalRule={rule}
                    migration={{
                      loading: migrationLoading,
                      error: migrationError,
                      rule: migration?.rule,
                    }}
                    newRuleActions={
                      isFlyoutOpen ? undefined : (
                        <NewRuleActions
                          onCreate={createRule}
                          onCustomize={openFlyout}
                          onView={createdRuleId ? viewCreatedRule : undefined}
                          isCreating={isCreating}
                          canCreate={Boolean(migration)}
                        />
                      )
                    }
                    onEditField={createdRuleId ? undefined : editField}
                  />
                </EuiPanel>
              ),
            },
            {
              title: i18n.translate(
                'xpack.observabilityAlerting.migrateRule.steps.convertActions',
                { defaultMessage: 'Convert actions' }
              ),
              status: actionsStepStatus,
              'data-test-subj': 'migrateRuleConvertActionsStep',
              children: (
                <EuiPanel hasBorder data-test-subj="migrateRuleActionsPanel">
                  <ActionsComparison
                    classicActions={rule.actions}
                    migration={migration}
                    connectorNames={connectorNames}
                    actionPolicyActions={
                      <CreateActionPoliciesButton
                        readyCount={readyActionPolicyCount}
                        isRuleCreated={Boolean(createdRuleId)}
                        isCreating={isCreatingPolicies}
                        createdCount={createdActionPolicyIds?.length}
                        onCreate={createActionPolicies}
                        onView={viewActionPolicies}
                      />
                    }
                  />
                </EuiPanel>
              ),
            },
          ]}
        />
      )}
      {isFlyoutOpen && !loading && !migrationLoading && (
        <CreateRuleFlyout
          flyoutType="push"
          initialRule={migration?.rule}
          stepRequest={stepRequest}
          onClose={closeFlyout}
          onRuleCreated={onRuleCreated}
        />
      )}
    </div>
  );
};
