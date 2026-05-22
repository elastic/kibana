/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import {
  type InlineRenderCallbacks,
  type ActionButton,
  ActionButtonType,
} from '@kbn/agent-builder-browser/attachments';
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
import { isOnRuleFormPage } from './helpers';
import type { RuleResponse } from '../../../../common/api/detection_engine/model/rule_schema';

interface UseRuleActionButtonsParams {
  rule: RuleResponse | null;
  aiRuleCreation: AiRuleCreationService;
  application: ApplicationStart;
  uiSettings: IUiSettingsClient;
  callbacks: InlineRenderCallbacks | undefined;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedRuleId: string | null | undefined;
  showButtons: boolean;
}

export const useRuleActionButtons = ({
  rule,
  aiRuleCreation,
  application,
  uiSettings,
  callbacks,
  isDirty,
  isSaving,
  lastSavedRuleId,
  showButtons,
}: UseRuleActionButtonsParams) => {
  const frozenSaveLabelRef = useRef<'save_rule' | 'save_changes' | null>(null);

  // Destructure to get a stable reference — callbacks object literal is recreated every render.
  const registerActionButtons = callbacks?.registerActionButtons;
  useEffect(() => {
    if (!registerActionButtons) return;
    const canEditRules = hasCapabilities(application.capabilities, RULES_UI_EDIT_PRIVILEGE);
    if (
      !rule ||
      !canEditRules ||
      !showButtons ||
      (rule.type === 'esql' && !uiSettings.get(ENABLE_ESQL))
    ) {
      registerActionButtons([]);
      return;
    }
    const savedRuleId = rule.id ?? lastSavedRuleId ?? undefined;
    // Disabled after a save until the agent makes another change; unsaved rules always enabled.
    const isClean = savedRuleId !== undefined && !isDirty;
    // Freeze label at first registration: pre-first-save cards show "Save rule", post-save show "Save changes".
    if (frozenSaveLabelRef.current === null) {
      frozenSaveLabelRef.current = savedRuleId ? 'save_changes' : 'save_rule';
    }

    const buttons: ActionButton[] = [
      {
        label: i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.openInForm', {
          defaultMessage: 'Open in form',
        }),
        icon: 'pencil',
        type: ActionButtonType.SECONDARY,
        handler: () => {
          aiRuleCreation.setAiCreatedRule(rule);
          application.navigateToApp('securitySolutionUI', {
            path: savedRuleId ? `${RULES_PATH}${getEditRuleUrl(savedRuleId)}` : RULES_CREATE_PATH,
          });
        },
      },
      {
        label:
          frozenSaveLabelRef.current === 'save_changes'
            ? i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.saveChanges', {
                defaultMessage: 'Save changes',
              })
            : i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.saveRule', {
                defaultMessage: 'Save rule',
              }),
        icon: 'save',
        type: ActionButtonType.PRIMARY,
        disabled: isSaving || isClean,
        handler: () => {
          aiRuleCreation.requestSaveRule(rule);
        },
      },
    ];
    if (savedRuleId && !isOnRuleFormPage(window.location.pathname)) {
      buttons.push({
        label: i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.viewRule', {
          defaultMessage: 'View rule',
        }),
        icon: 'popout',
        type: ActionButtonType.SECONDARY,
        handler: () => {
          application.navigateToApp('securitySolutionUI', {
            path: `${RULES_PATH}${getRuleDetailsUrl(savedRuleId)}`,
          });
        },
      });
    }

    registerActionButtons(buttons);
  }, [
    rule,
    isSaving,
    isDirty,
    lastSavedRuleId,
    showButtons,
    aiRuleCreation,
    application,
    uiSettings,
    registerActionButtons,
  ]);
};
