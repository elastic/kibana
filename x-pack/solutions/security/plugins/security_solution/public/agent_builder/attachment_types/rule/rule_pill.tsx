/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { encode } from '@kbn/rison';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { APP_UI_ID, SecurityPageName } from '../../../../common/constants';
import { FLYOUT_DESCRIPTOR_KIND } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { FlyoutPill, LinkPill } from '../conversation_details/pills';
import { getRuleIdFromAttachment, getRuleName, parseRuleFromAttachment } from './helpers';
import type { RuleAttachment } from './helpers';
import { RULE_PILL_LABEL } from './translations';

interface RulePillProps {
  attachment: UnknownAttachment;
  application: ApplicationStart;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

/**
 * Pill for `security.rule` attachments.
 * - Has a flyout-resolvable id → opens the rule flyout
 * - No id → falls back to the rules management page (filtered by name if available)
 */
export const RulePill = memo(
  ({ attachment, application, resolveSecurityCanvasContext }: RulePillProps) => {
    const ruleAttachment = attachment as unknown as RuleAttachment;
    const ruleId = parseRuleFromAttachment(ruleAttachment)?.id ?? getRuleIdFromAttachment(ruleAttachment);

    const resolveDescriptor = useCallback(
      () =>
        Promise.resolve(
          ruleId ? { kind: FLYOUT_DESCRIPTOR_KIND.rule, ruleId } : null
        ),
      [ruleId]
    );

    if (ruleId) {
      return (
        <FlyoutPill
          label={RULE_PILL_LABEL}
          resolveDescriptor={resolveDescriptor}
          resolveSecurityCanvasContext={resolveSecurityCanvasContext}
        />
      );
    }

    const ruleName = getRuleName(ruleAttachment);
    const query = ruleName ? `?rulesTable=${encode({ searchTerm: ruleName })}` : '';
    const href = application.getUrlForApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.rules,
      path: `/management${query}`,
    });
    return <LinkPill label={RULE_PILL_LABEL} href={href} />;
  }
);
RulePill.displayName = 'RulePill';
