/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { LeadFeedbackVerdict } from '../../common/findings_attachment';

export type { LeadFeedbackVerdict };

export const toggleLeadFeedback = (
  current: LeadFeedbackVerdict | undefined,
  clicked: LeadFeedbackVerdict
): LeadFeedbackVerdict | undefined => (current === clicked ? undefined : clicked);

export const LeadFeedbackControls = ({
  leadId,
  value,
  feedbackEnabled,
  onChange,
}: {
  leadId: string;
  value: LeadFeedbackVerdict | undefined;
  feedbackEnabled: boolean;
  onChange: (next: LeadFeedbackVerdict | undefined) => void;
}) => {
  if (!feedbackEnabled) {
    return null;
  }

  const usefulLabel = i18n.translate('xpack.signalInvestigation.flyout.feedback.useful', {
    defaultMessage: 'Useful',
  });
  const notUsefulLabel = i18n.translate('xpack.signalInvestigation.flyout.feedback.notUseful', {
    defaultMessage: 'Not useful',
  });
  const isUseful = value === 'useful';
  const isNotUseful = value === 'not_useful';

  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiToolTip content={usefulLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="thumbUp"
            size="xs"
            aria-label={usefulLabel}
            aria-pressed={isUseful}
            display={isUseful ? 'base' : 'empty'}
            color={isUseful ? 'primary' : 'text'}
            onClick={() => onChange(toggleLeadFeedback(value, 'useful'))}
            data-test-subj={`signalInvestigationFeedbackUseful-${leadId}`}
            {...getEbtProps({
              action: 'signalInvestigationLeadFeedbackUseful',
              element: 'signalInvestigationLeadCard',
            })}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={notUsefulLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="thumbDown"
            size="xs"
            aria-label={notUsefulLabel}
            aria-pressed={isNotUseful}
            display={isNotUseful ? 'base' : 'empty'}
            color={isNotUseful ? 'primary' : 'text'}
            onClick={() => onChange(toggleLeadFeedback(value, 'not_useful'))}
            data-test-subj={`signalInvestigationFeedbackNotUseful-${leadId}`}
            {...getEbtProps({
              action: 'signalInvestigationLeadFeedbackNotUseful',
              element: 'signalInvestigationLeadCard',
            })}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
