/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { isConversationNotFoundError } from '@kbn/agent-builder-common';
import type { MetadataFieldValue } from '@kbn/agent-builder-common';

/** The part of the conversation client this needs: the Investigation's metadata. */
export interface InvestigationReader {
  get: (conversationId: string) => Promise<{ metadata?: Record<string, MetadataFieldValue> }>;
}

/**
 * Whether an Investigation is still open, which is whether an analyst can see a Proposal raised on
 * it: a closed Investigation cannot hold one (see `alertzero/create_proposal.yaml`, which reopens
 * before it creates for that reason). Packaging asks about the Investigation that owns a live
 * Proposal before converging a finding onto it, because converging onto one the analyst cannot see
 * would hide the finding.
 *
 * An absent or empty status reads as open, as it does everywhere else. An Investigation that is
 * gone, or that this request cannot read, reads as not open: nothing is gained by converging onto
 * a Proposal nobody can be shown. Any other failure is logged and thrown, so the caller can retry
 * it or fail closed rather than guess.
 *
 * Answers are remembered for the run, since one Investigation can own several of the Proposals a
 * run meets. A failure is not remembered, so a retry asks again.
 */
export const createInvestigationOpenChecker = ({
  conversationClient,
  logger,
}: {
  conversationClient: InvestigationReader;
  logger?: Logger;
}): ((conversationId: string) => Promise<boolean>) => {
  const answers = new Map<string, boolean>();

  return async (conversationId) => {
    const known = answers.get(conversationId);
    if (known !== undefined) {
      return known;
    }

    let open: boolean;
    try {
      const conversation = await conversationClient.get(conversationId);
      open = conversation.metadata?.status !== 'closed';
    } catch (error) {
      if (!isConversationNotFoundError(error)) {
        logger?.warn(
          `package_report: could not tell whether Investigation ${conversationId} is open: ${
            (error as Error).message
          }`
        );
        throw error;
      }
      open = false;
    }

    answers.set(conversationId, open);
    return open;
  };
};
