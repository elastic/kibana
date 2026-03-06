/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import type { FC } from 'react';
import React, { useMemo } from 'react';
import { LineClamp } from '../../../common/components/line_clamp';
import {
  ALERT_DESCRIPTION_DETAILS_TEST_ID,
  ALERT_DESCRIPTION_TITLE_TEST_ID,
  RULE_SUMMARY_BUTTON_TEST_ID,
} from './test_ids';

export interface AlertDescriptionProps {
  /**
   * Alert/event document
   */
  hit: DataTableRecord;
  /**
   * Callback to show the rule summary flyout when the "Show rule summary" button is clicked. If not provided, the button won't be rendered.
   */
  onShowRuleSummary?: () => void;
  /**
   * Boolean to disable the "Show rule summary" button. This is used when the rule summary is loading or when there's an error loading it.
   */
  ruleSummaryDisabled?: boolean;
}

/**
 * Displays the rule description of a signal document.
 */
export const AlertDescription: FC<AlertDescriptionProps> = ({
  hit,
  onShowRuleSummary,
  ruleSummaryDisabled,
}) => {
  const isAlert = useMemo(() => (getFieldValue(hit, EVENT_KIND) as string) === 'signal', [hit]);

  const ruleDescription = useMemo(
    () => getFieldValue(hit, 'kibana.alert.rule.description') as string,
    [hit]
  );

  const viewRule = useMemo(
    () => (
      <EuiButtonEmpty
        size="s"
        iconType="expand"
        onClick={onShowRuleSummary}
        iconSide="right"
        data-test-subj={RULE_SUMMARY_BUTTON_TEST_ID}
        aria-label={i18n.translate(
          'xpack.securitySolution.flyout.document.about.description.ruleSummaryButtonAriaLabel',
          {
            defaultMessage: 'Show rule summary',
          }
        )}
        disabled={ruleSummaryDisabled}
      >
        <FormattedMessage
          id="xpack.securitySolution.flyout.document.about.description.ruleSummaryButtonLabel"
          defaultMessage="Show rule summary"
        />
      </EuiButtonEmpty>
    ),
    [onShowRuleSummary, ruleSummaryDisabled]
  );

  const alertRuleDescription = useMemo(
    () =>
      ruleDescription?.length > 0 ? (
        ruleDescription
      ) : (
        <FormattedMessage
          id="xpack.securitySolution.flyout.document.about.description.noRuleDescription"
          defaultMessage="There's no description for this rule."
        />
      ),
    [ruleDescription]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem data-test-subj={ALERT_DESCRIPTION_TITLE_TEST_ID} grow={false}>
        <EuiTitle size="xxs">
          {isAlert ? (
            <EuiFlexGroup
              justifyContent="spaceBetween"
              alignItems="center"
              gutterSize="none"
              responsive={false}
            >
              <EuiFlexItem>
                <h5>
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.document.about.description.ruleTitle"
                    defaultMessage="Rule description"
                  />
                </h5>
              </EuiFlexItem>
              {onShowRuleSummary && <EuiFlexItem grow={false}>{viewRule}</EuiFlexItem>}
            </EuiFlexGroup>
          ) : (
            <h5>
              <FormattedMessage
                id="xpack.securitySolution.flyout.document.about.description.documentTitle"
                defaultMessage="Document description"
              />
            </h5>
          )}
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem data-test-subj={ALERT_DESCRIPTION_DETAILS_TEST_ID}>
        <LineClamp>{isAlert ? alertRuleDescription : '-'}</LineClamp>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

AlertDescription.displayName = 'AlertDescription';
