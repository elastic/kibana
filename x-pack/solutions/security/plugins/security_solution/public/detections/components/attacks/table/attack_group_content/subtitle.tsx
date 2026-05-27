/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  replaceAnonymizedValuesWithOriginalValues,
  type AttackDiscoveryAlert,
} from '@kbn/elastic-assistant-common';
import { i18n } from '@kbn/i18n';
import { TableId } from '@kbn/securitysolution-data-table';

import { getFormattedDate } from '../../../../../attack_discovery/pages/loading_callout/loading_messages/get_formatted_time';
import { useDateFormat } from '../../../../../common/lib/kibana';
import { AttackDiscoveryMarkdownFormatter } from '../../../../../attack_discovery/pages/results/attack_discovery_markdown_formatter';

export const DETECTED_ON_LABEL = (timestamp: string) =>
  i18n.translate('xpack.securitySolution.detectionEngine.attacks.group.subtitle.detectedOnLabel', {
    defaultMessage: 'Detected on {timestamp}',
    values: { timestamp },
  });

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

  const subtitleMarkdownText = useMemo(() => {
    const summary = attack.entitySummaryMarkdown
      ? showAnonymized
        ? attack.entitySummaryMarkdown
        : replaceAnonymizedValuesWithOriginalValues({
            messageContent: attack.entitySummaryMarkdown,
            replacements: attack.replacements,
          })
      : null;

    const formattedTimestamp = getFormattedDate({
      date: attack.timestamp,
      dateFormat,
    });

    if (!formattedTimestamp) {
      return summary ?? '';
    }
    const summaryText = summary ? ` • ${summary}` : '';
    return `${DETECTED_ON_LABEL(formattedTimestamp)}${summaryText}`;
  }, [
    attack.entitySummaryMarkdown,
    attack.replacements,
    attack.timestamp,
    dateFormat,
    showAnonymized,
  ]);

  return (
    <AttackDiscoveryMarkdownFormatter
      scopeId={TableId.alertsOnAttacksPage}
      disableActions={showAnonymized}
      markdown={subtitleMarkdownText}
    />
  );
});
Subtitle.displayName = 'Subtitle';
