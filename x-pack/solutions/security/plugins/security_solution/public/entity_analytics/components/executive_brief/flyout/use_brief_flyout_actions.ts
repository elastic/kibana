/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { BriefEntity } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { useKibana } from '../../../../common/lib/kibana';
import { useOpenEntityFlyout } from '../../entity_badge';
import type { BriefActions, TriageRequest } from '../actions/brief_actions_context';
import {
  EXECUTIVE_BRIEF_SCOPE_ID,
  EXECUTIVE_BRIEF_SECTION_IDS,
  EXECUTIVE_BRIEF_TEST_IDS,
} from '../constants';
import { useRequestThreatOpen } from './threat_open_request';

const TRIAGE_SEPARATOR = '\n\n---\n\n';

/** Scrolls to a threat card, or to the threats section if the card is not rendered. */
const scrollToThreat = (rank: number): void => {
  const target =
    document.querySelector<HTMLElement>(
      `[data-test-subj="${EXECUTIVE_BRIEF_TEST_IDS.threatCard(rank)}"]`
    ) ?? document.getElementById(EXECUTIVE_BRIEF_SECTION_IDS.threats);
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/** The actions the flyout provides to the brief's presentational components. */
export const useBriefFlyoutActions = (): BriefActions => {
  const { agentBuilder } = useKibana().services;
  const { open } = useOpenEntityFlyout(EXECUTIVE_BRIEF_SCOPE_ID);
  const requestThreatOpen = useRequestThreatOpen();

  return useMemo<BriefActions>(() => {
    return {
      triage: agentBuilder?.openChat
        ? ({ instruction, evidenceMarkdown }: TriageRequest) =>
            agentBuilder?.openChat?.({
              initialMessage: `${instruction}${TRIAGE_SEPARATOR}${evidenceMarkdown}`,
              autoSendInitialMessage: false,
              newConversation: true,
              sessionTag: 'security',
            })
        : undefined,
      openEntity: ({ type, name, euid }: BriefEntity) => open({ type, name, id: euid }),
      openThreat: (rank: number) => {
        requestThreatOpen(rank);
        scrollToThreat(rank);
      },
    };
  }, [agentBuilder, open, requestThreatOpen]);
};
