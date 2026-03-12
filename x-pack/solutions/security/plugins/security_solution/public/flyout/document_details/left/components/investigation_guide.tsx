/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  buildDataTableRecord,
  type DataTableRecord,
  type EsHitRecord,
  getFieldValue,
} from '@kbn/discover-utils';
import { useRuleWithFallback } from '../../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { useDocumentDetailsContext } from '../../shared/context';
import { INVESTIGATION_GUIDE_LOADING_TEST_ID, INVESTIGATION_GUIDE_TEST_ID } from './test_ids';
import { InvestigationGuideView } from '../../../../flyout_v2/investigation_guide/components/investigation_guide_view';
import { FlyoutLoading } from '../../../shared/components/flyout_loading';

/**
 * Investigation guide displayed in the left panel.
 * Renders a message saying the guide hasn't been set up or the full investigation guide.
 */
export const InvestigationGuide: React.FC = () => {
  const { isRulePreview, searchHit } = useDocumentDetailsContext();

  const hit: DataTableRecord = React.useMemo(
    () => buildDataTableRecord(searchHit as unknown as EsHitRecord),
    [searchHit]
  );

  const isAlert = React.useMemo(
    () => Boolean(getFieldValue(hit, 'kibana.alert.rule.uuid') as string),
    [hit]
  );

  const ruleId = React.useMemo(
    () =>
      (isAlert
        ? (getFieldValue(hit, 'kibana.alert.rule.uuid') as string)
        : (getFieldValue(hit, 'signal.rule.id') as string)) ?? '',
    [hit, isAlert]
  );

  const { loading, error, rule } = useRuleWithFallback(ruleId);
  const ruleNote = rule?.note;

  return (
    <div data-test-subj={INVESTIGATION_GUIDE_TEST_ID}>
      {isRulePreview ? (
        <FormattedMessage
          id="xpack.securitySolution.flyout.left.investigation.previewMessage"
          defaultMessage="Investigation guide is not available in alert preview."
        />
      ) : loading ? (
        <FlyoutLoading data-test-subj={INVESTIGATION_GUIDE_LOADING_TEST_ID} />
      ) : !error && ruleId && ruleNote ? (
        <InvestigationGuideView hit={hit} investigationGuide={ruleNote} />
      ) : (
        <FormattedMessage
          id="xpack.securitySolution.flyout.left.investigation.noDataDescription"
          defaultMessage="There's no investigation guide for this rule. {documentation} to add one."
          values={{
            documentation: (
              <EuiLink
                href="https://www.elastic.co/guide/en/security/current/rules-ui-management.html#edit-rules-settings"
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.securitySolution.flyout.left.investigation.noDataLinkText"
                  defaultMessage="Edit the rule's settings"
                />
              </EuiLink>
            ),
          }}
        />
      )}
    </div>
  );
};

InvestigationGuide.displayName = 'InvestigationGuide';
