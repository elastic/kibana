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

import { getFormattedDate } from '../../../../../../attack_discovery/pages/loading_callout/loading_messages/get_formatted_time';
import { useDateFormat } from '../../../../../../common/lib/kibana';
import { AttackDiscoveryMarkdownFormatter } from '../../../../../../attack_discovery/pages/results/attack_discovery_markdown_formatter';
import * as i18n from './translations';

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
  const summary = useMemo(() => {
    if (!attack.entitySummaryMarkdown) {
      return null;
    }
    return showAnonymized
      ? attack.entitySummaryMarkdown
      : replaceAnonymizedValuesWithOriginalValues({
          messageContent: attack.entitySummaryMarkdown,
          replacements: attack.replacements,
        });
  }, [attack.entitySummaryMarkdown, attack.replacements, showAnonymized]);

  const dateFormat = useDateFormat();

  const formattedTimestamp = useMemo(
    () =>
      getFormattedDate({
        date: attack.timestamp,
        dateFormat,
      }),
    [attack.timestamp, dateFormat]
  );

  const subtitleMarkdownText = useMemo(() => {
    if (!formattedTimestamp) {
      return summary ?? '';
    }
    const summaryText = summary ? ` • ${summary}` : '';
    return `${i18n.DETECTED_ON_LABEL(formattedTimestamp)}${summaryText}`;
  }, [formattedTimestamp, summary]);

  return <AttackDiscoveryMarkdownFormatter disableActions={true} markdown={subtitleMarkdownText} />;
});
Subtitle.displayName = 'Subtitle';
