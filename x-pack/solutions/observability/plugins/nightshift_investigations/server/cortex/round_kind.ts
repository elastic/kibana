/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CortexRoundKind } from '../../common/cortex';
import { ALERT_RECOVERED_MESSAGE_PREFIX } from '../client/build_investigation_message';

/**
 * Tells the optimizer what kind of round it is learning from. The post-round hook carries no
 * follow-up context, so the alert-recovered follow-up is recognised by the sentence Nightshift opens
 * it with, and any other later round in the conversation is a follow-up.
 */
export const classifyCortexRound = ({
  userMessage,
  roundIndex,
}: {
  userMessage: string;
  /** Zero-based position of the round in its conversation, when known. */
  roundIndex?: number;
}): CortexRoundKind => {
  if (userMessage.trimStart().startsWith(ALERT_RECOVERED_MESSAGE_PREFIX)) {
    return 'alert_recovery';
  }
  return roundIndex !== undefined && roundIndex > 0 ? 'follow_up' : 'initial';
};
