/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { Alert } from '@kbn/alerting-types';
import { NewChatByTitle } from '@kbn/elastic-assistant/impl/new_chat_by_title';
import { useAssistant } from '../../../hooks/alert_summary/use_assistant';

export interface AssistantRowControlColumnProps {
  /**
   * Alert data passed from the renderCellValue callback via the AlertWithLegacyFormats interface
   */
  alert: Alert;
}

/**
 * Renders the assistant icon and opens the assistant flyout for the current alert when clicked.
 * This is used in the AI for SOC alert summary table.
 */
export const AssistantRowControlColumn = memo(({ alert }: AssistantRowControlColumnProps) => {
  const { showAssistantOverlay } = useAssistant({ alert });

  return <NewChatByTitle showAssistantOverlay={showAssistantOverlay} size="xs" />;
});

AssistantRowControlColumn.displayName = 'AssistantRowControlColumn';
