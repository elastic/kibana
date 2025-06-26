/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSwitch, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAIForSOCDetailsContext } from '../context';

export const ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID =
  'ai-for-soc-alert-flyout-alert-summary-anonymize-toggle';

/**
 * Conditionally wrap a component
 */
const ConditionalWrap = ({
  condition,
  wrap,
  children,
}: {
  condition: boolean;
  wrap: (children: React.ReactElement) => React.ReactElement;
  children: React.ReactElement;
}) => (condition ? wrap(children) : children);

export interface AnonymizationSwitchProps {
  /**
   * If true, the component will wrap the toggle with a tooltip
   */
  hasAlertSummary: boolean;
}

/**
 * Renders a toggle switch used in the AI for SOC alert summary flyout in the AI summary section.
 * This enables/disables anonymized values.
 */
export const AnonymizationSwitch = memo(({ hasAlertSummary }: AnonymizationSwitchProps) => {
  const { showAnonymizedValues, setShowAnonymizedValues } = useAIForSOCDetailsContext();

  const onChangeShowAnonymizedValues = useCallback(
    (e: EuiSwitchEvent) => {
      setShowAnonymizedValues(e.target.checked);
    },
    [setShowAnonymizedValues]
  );

  return (
    <>
      {showAnonymizedValues !== undefined && (
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <ConditionalWrap
              condition={!hasAlertSummary}
              wrap={(children) => (
                <EuiToolTip
                  position="top"
                  key={'disabled-anonymize-values-tooltip'}
                  content={
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.settings.anonymizeValues.disabled.tooltip"
                      defaultMessage="The alert summary has not generated, and does not contain anonymized fields."
                    />
                  }
                >
                  {children}
                </EuiToolTip>
              )}
            >
              <EuiSwitch
                data-test-subj={ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID}
                checked={showAnonymizedValues ?? false}
                compressed
                disabled={!hasAlertSummary}
                label={i18n.translate('xpack.securitySolution.flyout.settings.anonymizeValues', {
                  defaultMessage: 'Show anonymized values',
                })}
                onChange={onChangeShowAnonymizedValues}
              />
            </ConditionalWrap>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              position="top"
              key={'anonymize-values-tooltip'}
              content={
                <FormattedMessage
                  id="xpack.securitySolution.flyout.settings.anonymizeValues.tooltip"
                  defaultMessage="Toggle to reveal or obfuscate field values in your alert summary. The data sent to the LLM is still anonymized based on settings in Configurations > AI Settings > Anonymization."
                />
              }
            >
              <EuiIcon tabIndex={0} type="info" />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </>
  );
});

AnonymizationSwitch.displayName = 'AnonymizationSwitch';
