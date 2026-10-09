/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentType } from 'react';
import { encode } from '@kbn/rison';
import { GroupedAttachmentRow } from '@kbn/agentic-investigations-common';
import type { FlyoutGroupedAttachmentRendererProps } from '@kbn/agentic-investigations-common';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { APP_UI_ID, SecurityPageName } from '../../../../common/constants';
import { FLYOUT_DESCRIPTOR_KIND } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { FlyoutRow, RULE_FALLBACK_TITLE, RULE_SUBTITLE, rulesTitle } from '../grouped_attachments';
import { getRuleName, getSavedRuleId } from './helpers';
import type { RuleAttachment } from './helpers';

export interface RulesGroupRendererDeps {
  application: ApplicationStart;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

export const createRulesGroupRenderer = ({
  application,
  resolveSecurityCanvasContext,
}: RulesGroupRendererDeps): ComponentType<FlyoutGroupedAttachmentRendererProps> => {
  const RulesGroupRenderer = ({ attachments }: FlyoutGroupedAttachmentRendererProps) => {
    const rules = new Map<string, RuleAttachment>();
    for (const attachment of attachments) {
      const rule = attachment as unknown as RuleAttachment;
      const key = getSavedRuleId(rule) ?? attachment.id;
      if (!rules.has(key)) {
        rules.set(key, rule);
      }
    }

    if (rules.size > 1) {
      const href = application.getUrlForApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.rules,
        path: '/management',
      });

      return (
        <GroupedAttachmentRow
          iconType="document"
          iconColor="subdued"
          title={rulesTitle(rules.size)}
          action={{ kind: 'page', href }}
        />
      );
    }

    return (
      <>
        {[...rules].map(([key, ruleAttachment]) => {
          const ruleName = getRuleName(ruleAttachment);
          const title = ruleName ?? RULE_FALLBACK_TITLE;
          const ruleId = getSavedRuleId(ruleAttachment);

          if (ruleId) {
            return (
              <FlyoutRow
                key={key}
                iconType="document"
                iconColor="subdued"
                title={title}
                subtitle={RULE_SUBTITLE}
                descriptor={{ kind: FLYOUT_DESCRIPTOR_KIND.rule, ruleId }}
                resolveSecurityCanvasContext={resolveSecurityCanvasContext}
              />
            );
          }

          const query = ruleName
            ? `?rulesTable=${encodeURIComponent(encode({ searchTerm: ruleName }))}`
            : '';
          const href = application.getUrlForApp(APP_UI_ID, {
            deepLinkId: SecurityPageName.rules,
            path: `/management${query}`,
          });

          return (
            <GroupedAttachmentRow
              key={key}
              iconType="document"
              iconColor="subdued"
              title={title}
              subtitle={RULE_SUBTITLE}
              action={{ kind: 'page', href }}
            />
          );
        })}
      </>
    );
  };

  return RulesGroupRenderer;
};
