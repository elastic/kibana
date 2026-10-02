/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { buildRulesPageUrl } from './security_urls';
import { toRuleDescriptor } from './to_flyout_descriptor';
import { useFlyoutPill } from './use_flyout_pill';
import { LinkPill } from './attachment_pill';
import { CONVERSATION_DETAILS_LABELS } from './translations';

interface RulePillProps {
  attachment: UnknownAttachment;
  application: ApplicationStart;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

const parseRuleName = (attachment: UnknownAttachment): string | undefined => {
  const data = attachment.data as { attachmentLabel?: unknown; text?: unknown } | undefined;
  if (typeof data?.attachmentLabel === 'string') return data.attachmentLabel;
  if (typeof data?.text === 'string') {
    try {
      const parsed = JSON.parse(data.text) as { name?: unknown };
      return typeof parsed?.name === 'string' ? parsed.name : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
};

/**
 * Pill for `security.rule` attachments.
 * - Has a flyout-resolvable id → opens the rule flyout
 * - No id → falls back to the rules management page (filtered by name if available)
 */
export const RulePill = memo(
  ({ attachment, application, resolveSecurityCanvasContext }: RulePillProps) => {
    const descriptor = useMemo(() => toRuleDescriptor(attachment), [attachment]);
    const label = CONVERSATION_DETAILS_LABELS.rules(1);

    const resolveDescriptor = useCallback(() => Promise.resolve(descriptor), [descriptor]);

    const pill = useFlyoutPill({ label, resolveDescriptor, resolveSecurityCanvasContext });

    if (descriptor) {
      return <>{pill}</>;
    }

    // No rule id — link to the rules management page (filtered by name when available)
    const ruleName = parseRuleName(attachment);
    const href = buildRulesPageUrl({ ruleName, application });
    return <LinkPill label={label} href={href} />;
  }
);
RulePill.displayName = 'RulePill';
