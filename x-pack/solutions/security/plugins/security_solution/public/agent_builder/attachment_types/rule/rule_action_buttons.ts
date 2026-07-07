/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ActionButton, ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { RULES_UI_EDIT_PRIVILEGE } from '@kbn/security-solution-features/constants';
import type { AiRuleCreationService } from '../../../detection_engine/common/ai_rule_creation_store';
import { hasCapabilities } from '../../../common/lib/capabilities';
import { RULES_PATH, RULES_CREATE_PATH } from '../../../../common/constants';
import {
  getEditRuleUrl,
  getRuleDetailsUrl,
} from '../../../common/components/link_to/redirect_to_detection_engine';
import { type RuleAttachmentIntent, getRuleTypeLabel } from './helpers';
import type { RuleResponse } from '../../../../common/api/detection_engine/model/rule_schema';
import {
  getNonEsqlRuleActionDisabledReason,
  APPLY_TO_RULE_FORM,
  VIEW_RULE,
  UPDATE_RULE,
  CREATE_RULE,
} from './translations';

interface BuildRuleActionButtonsParams {
  rule: RuleResponse | null;
  aiRuleCreation: AiRuleCreationService;
  application: ApplicationStart;
  uiSettings: IUiSettingsClient;
  intent: RuleAttachmentIntent;
  ruleId: string | undefined;
  attachmentId: string;
  /**
   * Framework callback that links the attachment to its saved rule via `origin` and invalidates
   * the conversation. Threaded into the save request and called once the rule is persisted.
   */
  updateOrigin: (origin: string) => Promise<unknown>;
}

// Called from `getActionButtons` (not a hook).
export const buildRuleActionButtons = ({
  rule,
  aiRuleCreation,
  application,
  uiSettings,
  intent,
  ruleId,
  attachmentId,
  updateOrigin,
}: BuildRuleActionButtonsParams): ActionButton[] => {
  const canEditRules = hasCapabilities(application.capabilities, RULES_UI_EDIT_PRIVILEGE);
  if (!rule || !canEditRules || (rule.type === 'esql' && !uiSettings.get(ENABLE_ESQL))) {
    return [];
  }

  const isUpdate = intent === 'update';
  const isEsql = rule.type === 'esql';
  const disabledReason = isEsql
    ? undefined
    : getNonEsqlRuleActionDisabledReason(getRuleTypeLabel(rule.type));

  const buttons: ActionButton[] = [
    {
      label: APPLY_TO_RULE_FORM,
      icon: 'pencil' as const,
      type: ActionButtonType.SECONDARY,
      handler: () => {
        // When the target form is already open, navigateToApp to the same path is a no-op and
        // the aiCreatedRule$ subscription applies the rule to the form in place.
        aiRuleCreation.setAiCreatedRule(rule, attachmentId);
        application.navigateToApp('securitySolutionUI', {
          path: isUpdate && ruleId ? `${RULES_PATH}${getEditRuleUrl(ruleId)}` : RULES_CREATE_PATH,
        });
      },
    },
    ...(isUpdate && ruleId
      ? [
          {
            label: VIEW_RULE,
            icon: 'popout' as const,
            type: ActionButtonType.SECONDARY,
            handler: () => {
              application.navigateToApp('securitySolutionUI', {
                path: `${RULES_PATH}${getRuleDetailsUrl(ruleId)}`,
              });
            },
          },
        ]
      : []),
    isUpdate
      ? {
          label: UPDATE_RULE,
          icon: 'save',
          type: ActionButtonType.PRIMARY,
          disabled: !isEsql,
          disabledReason,
          handler: () => {
            // getActionButtons is not reactive to saving$, so guard against double-submit here.
            if (aiRuleCreation.getIsSaving(attachmentId)) {
              return;
            }
            aiRuleCreation.requestSaveRule(
              { ...rule, id: ruleId ?? rule.id },
              { attachmentId, updateOrigin }
            );
          },
        }
      : {
          label: CREATE_RULE,
          icon: 'plusInCircle',
          type: ActionButtonType.PRIMARY,
          disabled: !isEsql,
          disabledReason,
          handler: () => {
            if (aiRuleCreation.getIsSaving(attachmentId)) {
              return;
            }
            const { id: _id, ...ruleWithoutId } = rule as RuleResponse & { id?: string };
            aiRuleCreation.requestSaveRule(ruleWithoutId as RuleResponse, {
              attachmentId,
              updateOrigin,
            });
          },
        },
  ];
  return buttons;
};
