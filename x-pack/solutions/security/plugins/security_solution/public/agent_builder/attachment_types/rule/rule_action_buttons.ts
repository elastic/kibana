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
import {
  RULES_UI_EDIT_PRIVILEGE,
  RULES_UI_READ_PRIVILEGE,
} from '@kbn/security-solution-features/constants';
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

interface RuleActionContext {
  rule: RuleResponse;
  aiRuleCreation: AiRuleCreationService;
  application: ApplicationStart;
  uiSettings: IUiSettingsClient;
  attachmentId: string;
}

interface BuildRuleActionButtonsParams extends Omit<RuleActionContext, 'rule'> {
  rule: RuleResponse | null;
  intent: RuleAttachmentIntent;
  ruleId: string | undefined;
  /**
   * Framework callback that links the attachment to its saved rule via `origin` and invalidates
   * the conversation. Threaded into the create request and called once the rule is persisted.
   */
  updateOrigin: (origin: string) => Promise<unknown>;
}

interface BuildPendingChangeButtonsParams extends RuleActionContext {
  /** Saved-object id of the rule the card updates. */
  ruleId: string;
}

const canReadRules = (application: ApplicationStart): boolean =>
  hasCapabilities(application.capabilities, [RULES_UI_READ_PRIVILEGE, RULES_UI_EDIT_PRIVILEGE]);

// Editing actions also need ES|QL turned on in Advanced Settings when the rule is ES|QL.
const canEditRule = ({
  application,
  uiSettings,
  rule,
}: Pick<RuleActionContext, 'application' | 'uiSettings' | 'rule'>): boolean =>
  hasCapabilities(application.capabilities, RULES_UI_EDIT_PRIVILEGE) &&
  (rule.type !== 'esql' || Boolean(uiSettings.get(ENABLE_ESQL)));

const getDisabledReason = (rule: RuleResponse): string | undefined =>
  rule.type === 'esql'
    ? undefined
    : getNonEsqlRuleActionDisabledReason(getRuleTypeLabel(rule.type));

const buildApplyToRuleFormButton = (
  { rule, aiRuleCreation, application, attachmentId }: RuleActionContext,
  { path, type }: { path: string; type: ActionButtonType }
): ActionButton => ({
  label: APPLY_TO_RULE_FORM,
  icon: 'pencil',
  type,
  handler: () => {
    // When the target form is already open, navigateToApp to the same path is a no-op and
    // the aiCreatedRule$ subscription applies the rule to the form in place.
    aiRuleCreation.setAiCreatedRule(rule, attachmentId);
    application.navigateToApp('securitySolutionUI', { path });
  },
});

const buildViewRuleButton = (application: ApplicationStart, ruleId: string): ActionButton => ({
  label: VIEW_RULE,
  icon: 'external',
  type: ActionButtonType.SECONDARY,
  handler: () => {
    application.navigateToApp('securitySolutionUI', {
      path: `${RULES_PATH}${getRuleDetailsUrl(ruleId)}`,
    });
  },
});

/**
 * Header buttons that depend only on the attachment. A create-intent card gets Create rule and
 * Apply to rule form; an update-intent card gets View rule. Called from `getActionButtons`.
 */
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
  if (!rule) {
    return [];
  }

  if (intent === 'update') {
    return ruleId && canReadRules(application) ? [buildViewRuleButton(application, ruleId)] : [];
  }

  const context: RuleActionContext = {
    rule,
    aiRuleCreation,
    application,
    uiSettings,
    attachmentId,
  };
  if (!canEditRule(context)) {
    return [];
  }

  return [
    buildApplyToRuleFormButton(context, {
      path: RULES_CREATE_PATH,
      type: ActionButtonType.SECONDARY,
    }),
    {
      label: CREATE_RULE,
      icon: 'plusCircle',
      type: ActionButtonType.PRIMARY,
      disabled: rule.type !== 'esql',
      disabledReason: getDisabledReason(rule),
      handler: () => {
        // getActionButtons is not reactive to saving$, so guard against double-submit here.
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
};

/**
 * Buttons for a card that proposes changes to a saved rule: Update rule and Apply to rule form.
 * The card body registers them only when it is the latest version and differs from the saved
 * rule. Update rule saves the whole card, so it is the main button only for ES|QL rules; for
 * other rule types it is disabled and Apply to rule form is the main button.
 */
export const buildPendingChangeButtons = ({
  ruleId,
  ...context
}: BuildPendingChangeButtonsParams): ActionButton[] => {
  if (!canEditRule(context)) {
    return [];
  }

  const { rule, aiRuleCreation, attachmentId } = context;
  const isEsql = rule.type === 'esql';

  const applyButton = buildApplyToRuleFormButton(context, {
    path: `${RULES_PATH}${getEditRuleUrl(ruleId)}`,
    type: isEsql ? ActionButtonType.SECONDARY : ActionButtonType.PRIMARY,
  });
  const updateButton: ActionButton = {
    label: UPDATE_RULE,
    icon: 'save',
    type: isEsql ? ActionButtonType.PRIMARY : ActionButtonType.SECONDARY,
    disabled: !isEsql,
    disabledReason: getDisabledReason(rule),
    handler: () => {
      if (aiRuleCreation.getIsSaving(attachmentId)) {
        return;
      }
      aiRuleCreation.requestSaveRule({ ...rule, id: ruleId }, { attachmentId });
    },
  };

  return isEsql ? [updateButton, applyButton] : [applyButton, updateButton];
};
