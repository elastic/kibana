/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { NewChatByTitle } from '@kbn/elastic-assistant';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { AgentBuilderAddToChatTelemetry } from '../../../../agent_builder/hooks/use_report_add_to_chat';
import {
  ALERT_ATTACHMENT_PROMPT,
  EVENT_ATTACHMENT_PROMPT,
} from '../../../../agent_builder/components/prompts';
import { useAssistant } from '../hooks/use_assistant';
import { useEventDetails } from '../../../../flyout/document_details/shared/hooks/use_event_details';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';
import { NewAgentBuilderAttachment } from '../../../../agent_builder/components/new_agent_builder_attachment';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';
import { getRawData } from '../../../../assistant/helpers';
import { stringifyEssentialAlertData } from '../../../../agent_builder/helpers';
import { SecurityAgentBuilderAttachments } from '../../../../../common/constants';

const ASK_AI_ASSISTANT = i18n.translate(
  'xpack.securitySolution.flyout.footerAiActions.askAIAssistant',
  { defaultMessage: 'Ask AI Assistant' }
);
const EVENT = i18n.translate('xpack.securitySolution.flyout.footerAiActions.event', {
  defaultMessage: 'Security Event',
});

const TELEMETRY: AgentBuilderAddToChatTelemetry = {
  pathway: 'alerts_flyout',
  attachments: ['alert'],
};
const EMPTY_ARRAY: TimelineEventsDetailsItem[] = [];

export interface FooterAiActionsProps {
  /**
   * The document record to derive AI context from
   */
  hit: DataTableRecord;
  /**
   * Pre-fetched ECS-expanded field data. When provided the internal fetch is skipped.
   * The old flyout passes this from its context to avoid a duplicate network request.
   * When omitted (new flyout) the data is fetched internally via the timeline strategy.
   */
  dataFormattedForFieldBrowser?: TimelineEventsDetailsItem[];
}

/**
 * Renders the agent builder or classic assistant button for use in flyout footers.
 * Returns null when neither feature is available or while data is loading.
 */
export const FooterAiActions: FC<FooterAiActionsProps> = ({
  hit,
  dataFormattedForFieldBrowser: dataFormattedForFieldBrowserProp,
}) => {
  const { dataFormattedForFieldBrowser: fetchedData, loading } = useEventDetails({
    eventId: hit.raw._id,
    indexName: hit.raw._index,
    skip: dataFormattedForFieldBrowserProp != null,
  });

  const isAlert = Boolean(getFieldValue(hit, ALERT_RULE_UUID));

  // Use the prop when available (old flyout), fall back to fetched data (new flyout).
  // Use empty array while loading so hooks below can be called unconditionally.
  const safeData = useMemo(
    () => dataFormattedForFieldBrowserProp ?? fetchedData ?? EMPTY_ARRAY,
    [dataFormattedForFieldBrowserProp, fetchedData]
  );

  const { isAgentChatExperienceEnabled } = useAgentBuilderAvailability();

  const alertAttachment = useMemo(() => {
    const rawData = getRawData(safeData);
    return {
      attachmentType: SecurityAgentBuilderAttachments.alert,
      attachmentData: {
        alert: stringifyEssentialAlertData(rawData),
        attachmentLabel: isAlert ? rawData[ALERT_RULE_NAME]?.[0] : EVENT,
      },
      attachmentPrompt: isAlert ? ALERT_ATTACHMENT_PROMPT : EVENT_ATTACHMENT_PROMPT,
    };
  }, [safeData, isAlert]);

  const { openAgentBuilderFlyout } = useAgentBuilderAttachment(alertAttachment);

  const { showAssistant, showAssistantOverlay } = useAssistant({
    dataFormattedForFieldBrowser: safeData,
    isAlert,
  });

  if (loading && dataFormattedForFieldBrowserProp == null) return null;

  if (isAgentChatExperienceEnabled) {
    return <NewAgentBuilderAttachment onClick={openAgentBuilderFlyout} telemetry={TELEMETRY} />;
  }

  if (showAssistant) {
    return <NewChatByTitle showAssistantOverlay={showAssistantOverlay} text={ASK_AI_ASSISTANT} />;
  }

  return null;
};

FooterAiActions.displayName = 'FooterAiActions';
