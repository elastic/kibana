/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiAvatar, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import {
  replaceAnonymizedValuesWithOriginalValues,
  type AttackDiscoveryAlert,
  ATTACK_DISCOVERY_AD_HOC_RULE_ID,
} from '@kbn/elastic-assistant-common';
import { i18n } from '@kbn/i18n';
import { TableId } from '@kbn/securitysolution-data-table';

import { getOriginalAlertIds } from '../../../../../attack_discovery/helpers';
import { getFormattedDate } from '../../../../../attack_discovery/pages/loading_callout/loading_messages/get_formatted_time';
import { useDateFormat } from '../../../../../common/lib/kibana';
import { AttackDiscoveryMarkdownFormatter } from '../../../../../attack_discovery/pages/results/attack_discovery_markdown_formatter';

export const DETECTED_ON_LABEL = (timestamp: string) =>
  i18n.translate('xpack.securitySolution.detectionEngine.attacks.group.subtitle.detectedOnLabel', {
    defaultMessage: 'Detected on {timestamp}',
    values: { timestamp },
  });

export const RUN_BY_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.attacks.group.subtitle.runByLabel',
  {
    defaultMessage: 'Run by:',
  }
);

export const UNKNOWN_USER_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.attacks.group.subtitle.unknownUserLabel',
  {
    defaultMessage: 'Unknown',
  }
);

export interface SubtitleProps {
  /**
   * The attack discovery alert object containing details about the attack.
   */
  attack: AttackDiscoveryAlert;
  /**
   * Whether to show anonymized values in the summary.
   * @default false
   */
  showAnonymized?: boolean;
}

/**
 * A component that displays the subtitle for an attack group, including the detection timestamp and a summary.
 */
export const Subtitle = React.memo<SubtitleProps>(({ attack, showAnonymized = false }) => {
  const dateFormat = useDateFormat();

  const summary = useMemo(() => {
    return attack.entitySummaryMarkdown
      ? showAnonymized
        ? attack.entitySummaryMarkdown
        : replaceAnonymizedValuesWithOriginalValues({
            messageContent: attack.entitySummaryMarkdown,
            replacements: attack.replacements,
          })
      : null;
  }, [attack.entitySummaryMarkdown, attack.replacements, showAnonymized]);

  const formattedTimestamp = useMemo(() => {
    return getFormattedDate({
      date: attack.timestamp,
      dateFormat,
    });
  }, [attack.timestamp, dateFormat]);

  const isManual = attack.alertRuleUuid === ATTACK_DISCOVERY_AD_HOC_RULE_ID;
  const separator = '|';
  const userName = attack.userName || UNKNOWN_USER_LABEL;

  const originalAlertIds = useMemo(
    () => getOriginalAlertIds(attack.alertIds, attack.replacements),
    [attack.alertIds, attack.replacements]
  );

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      wrap={true}
      data-test-subj="attack-subtitle"
    >
      {formattedTimestamp && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {DETECTED_ON_LABEL(formattedTimestamp)}
          </EuiText>
        </EuiFlexItem>
      )}

      {isManual && (
        <>
          {formattedTimestamp && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {separator}
              </EuiText>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {RUN_BY_LABEL}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiAvatar size="s" name={userName} data-test-subj="attack-run-by-avatar" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </>
      )}

      {summary && (
        <>
          {(formattedTimestamp || isManual) && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {separator}
              </EuiText>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <AttackDiscoveryMarkdownFormatter
              scopeId={TableId.alertsOnAttacksPage}
              disableActions={showAnonymized}
              markdown={summary}
              alertIds={originalAlertIds}
            />
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
});
Subtitle.displayName = 'Subtitle';
