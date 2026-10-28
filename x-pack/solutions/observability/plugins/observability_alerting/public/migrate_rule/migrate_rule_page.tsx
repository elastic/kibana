/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { EuiCallOut, EuiPageHeader, EuiPanel, EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import type { ChromeBreadcrumb, HttpStart } from '@kbn/core/public';
import type { AlertingV2PublicStart } from '@kbn/alerting-v2-plugin/public';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/react-hooks';
import { resolveRule } from '@kbn/response-ops-rule-form';
import {
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '../constants';
import type { RuleFormStepId } from './rule_comparison';
import { RuleComparison } from './rule_comparison';
import { NewRuleActions } from './new_rule_actions';

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
  onRuleCreated: () => void;
}

export const MigrateRulePage = ({
  http,
  setBreadcrumbs,
  CreateRuleFlyout,
  migrateRule,
  createMigratedRule,
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
  const createRuleAndPolicies = useCallback(async () => {
    if (!migration) return;
    setIsCreating(true);
    try {
      const { ruleId: newRuleId } = await createMigratedRule(migration);
      setCreatedRuleId(newRuleId);
    } finally {
      setIsCreating(false);
    }
  }, [createMigratedRule, migration]);
  const viewCreatedRule = useCallback(() => {
    if (!createdRuleId) return;
    history.push(`${OBSERVABILITY_ALERTING_RULES_V2_PATH}/${encodeURIComponent(createdRuleId)}`);
  }, [history, createdRuleId]);

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
            'Use your classic rule as a reference while you configure its Universal replacement.',
        })}
        bottomBorder
      />
      <EuiSpacer size="l" />
      <EuiPanel hasBorder data-test-subj="migrateRuleComparisonPanel">
        {error ? (
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="error"
            title={i18n.translate(
              'xpack.observabilityAlerting.migrateRule.originalRule.loadError',
              { defaultMessage: 'Unable to load the original rule' }
            )}
            data-test-subj="migrateRuleOriginalRuleError"
          >
            {error.message}
          </EuiCallOut>
        ) : loading || !rule ? (
          <EuiSkeletonText lines={8} data-test-subj="migrateRuleOriginalRuleLoading" />
        ) : (
          <RuleComparison
            originalRule={rule}
            migration={{
              loading: migrationLoading,
              error: migrationError,
              result: migration,
            }}
            newRuleActions={
              isFlyoutOpen ? undefined : (
                <NewRuleActions
                  onCreate={createRuleAndPolicies}
                  onCustomize={openFlyout}
                  onView={createdRuleId ? viewCreatedRule : undefined}
                  isCreating={isCreating}
                  canCreate={Boolean(migration)}
                />
              )
            }
            onEditField={createdRuleId ? undefined : editField}
            connectorNames={connectorNames}
          />
        )}
      </EuiPanel>
      {isFlyoutOpen && !loading && (
        <CreateRuleFlyout
          flyoutType="push"
          classicRule={rule}
          stepRequest={stepRequest}
          onClose={closeFlyout}
          onRuleCreated={onRuleCreated}
        />
      )}
    </div>
  );
};
