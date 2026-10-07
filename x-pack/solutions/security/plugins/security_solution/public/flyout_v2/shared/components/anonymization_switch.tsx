/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiSwitch, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const DOCUMENT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID =
  'document-flyout-ai-summary-anonymize-toggle';

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
  hasSummary: boolean;
  showAnonymizedValues: boolean | undefined;
  onChange: (e: EuiSwitchEvent) => void;
  /**
   * Optional content to render after the switch in place of the default info
   * tooltip (e.g. a gear button that opens the anonymization-settings modal in
   * the entity highlights panel).
   */
  icon?: React.ReactNode;
  /**
   * When provided the switch is wrapped in a tooltip while disabled, explaining
   * why it is not yet interactive. Omit to disable without a tooltip.
   */
  disabledTooltip?: React.ReactNode;
}

export const AnonymizationSwitch = memo(
  ({
    hasSummary,
    showAnonymizedValues,
    onChange,
    icon,
    disabledTooltip,
  }: AnonymizationSwitchProps) => {
    if (showAnonymizedValues === undefined) {
      return null;
    }

    const switchElement = (
      <EuiSwitch
        data-test-subj={DOCUMENT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID}
        checked={showAnonymizedValues}
        compressed
        disabled={!hasSummary}
        label={i18n.translate('xpack.securitySolution.flyout.settings.anonymizeValues', {
          defaultMessage: 'Show anonymized values',
        })}
        onChange={onChange}
      />
    );

    const trailingItem =
      icon !== undefined ? (
        icon
      ) : (
        <EuiIconTip
          position="top"
          content={
            <FormattedMessage
              id="xpack.securitySolution.flyout.settings.anonymizeValues.tooltip"
              defaultMessage="Toggle to reveal or obfuscate field values in your alert summary. The data sent to the LLM is still anonymized based on settings in Configurations > AI Settings > Anonymization."
            />
          }
          type="info"
        />
      );

    return (
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <ConditionalWrap
            condition={!hasSummary && disabledTooltip !== undefined}
            wrap={(children) => (
              <EuiToolTip position="top" content={disabledTooltip}>
                {children}
              </EuiToolTip>
            )}
          >
            {switchElement}
          </ConditionalWrap>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{trailingItem}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

AnonymizationSwitch.displayName = 'AnonymizationSwitch';
