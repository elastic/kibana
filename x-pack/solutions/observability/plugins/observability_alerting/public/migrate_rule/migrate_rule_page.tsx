/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  EuiButton,
  EuiCallOut,
  EuiPageHeader,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
} from '@elastic/eui';
import type { ChromeBreadcrumb, HttpStart } from '@kbn/core/public';
import type { AlertingV2PublicStart } from '@kbn/alerting-v2-plugin/public';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/react-hooks';
import { resolveRule } from '@kbn/response-ops-rule-form';
import { OBSERVABILITY_ALERTING_RULES_V1_PATH } from '../constants';
import { OriginalRulePanel } from './original_rule_panel';

const MIGRATE_RULE_TITLE = i18n.translate('xpack.observabilityAlerting.migrateRule.title', {
  defaultMessage: 'Migrate rule',
});

export interface MigrateRulePageProps {
  http: HttpStart;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  CreateRuleFlyout: AlertingV2PublicStart['CreateRuleFlyout'];
  onRuleCreated: () => void;
}

export const MigrateRulePage = ({
  http,
  setBreadcrumbs,
  CreateRuleFlyout,
  onRuleCreated,
}: MigrateRulePageProps) => {
  const { ruleId } = useParams<{ ruleId: string }>();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(true);
  const openFlyout = useCallback(() => setIsFlyoutOpen(true), []);
  const closeFlyout = useCallback(() => setIsFlyoutOpen(false), []);

  const {
    value: rule,
    loading,
    error,
  } = useAbortableAsync(() => resolveRule({ http, id: ruleId }), [http, ruleId]);

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
        rightSideItems={
          isFlyoutOpen
            ? []
            : [
                <EuiButton
                  key="configureNewRule"
                  fill
                  iconType="plusInCircle"
                  onClick={openFlyout}
                  data-test-subj="migrateRuleOpenNewRuleFlyout"
                >
                  {i18n.translate('xpack.observabilityAlerting.migrateRule.configureNewRule', {
                    defaultMessage: 'Configure new rule',
                  })}
                </EuiButton>,
              ]
        }
      />
      <EuiSpacer size="l" />
      <EuiPanel hasBorder color="subdued" data-test-subj="migrateRuleOriginalRulePanel">
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
          <OriginalRulePanel rule={rule} />
        )}
      </EuiPanel>
      {isFlyoutOpen && (
        <CreateRuleFlyout flyoutType="push" onClose={closeFlyout} onRuleCreated={onRuleCreated} />
      )}
    </div>
  );
};
