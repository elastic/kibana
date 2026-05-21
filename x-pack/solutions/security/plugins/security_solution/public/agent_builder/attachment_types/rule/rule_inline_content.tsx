/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import {
  type AttachmentRenderProps,
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
import { FiltersDisplay } from './filters_display';
import { RuleTypeDetails } from './rule_type_details';
import { EmptyRuleContent } from './empty_rule_content';
import { ScheduleDisplay } from './schedule_display';
import {
  parseRuleFromAttachment,
  getRuleTypeLabel,
  getQueryLabel,
  isOnRuleFormPage,
} from './helpers';
import type { RuleAttachment } from './helpers';
import { INDEX_FIELD_LABEL, RULE_TYPE_FIELD_LABEL } from './translations';

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiText size="s">
    <strong>{children}</strong>
  </EuiText>
);

const TagsBadgeList: React.FC<{ tags: string[] }> = ({ tags }) => (
  <EuiFlexGroup responsive={false} gutterSize="xs" wrap>
    {tags.map((tag) => (
      <EuiFlexItem grow={false} key={tag}>
        <EuiBadge color="hollow">{tag}</EuiBadge>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

const IndexPatterns: React.FC<{ patterns: string[] }> = ({ patterns }) => (
  <>
    <SectionHeading>{INDEX_FIELD_LABEL}</SectionHeading>
    <EuiSpacer size="xs" />
    <EuiFlexGroup responsive={false} gutterSize="xs" wrap>
      {patterns.map((pattern) => (
        <EuiFlexItem grow={false} key={pattern}>
          <EuiBadge color="hollow">{pattern}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  </>
);

const SeverityRiskScore: React.FC<{
  severity?: string;
  riskScore?: number;
}> = ({ severity, riskScore }) => (
  <EuiText size="s">
    {severity && (
      <>
        <strong>
          {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.severityLabel', {
            defaultMessage: 'Severity:',
          })}
        </strong>{' '}
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
        {riskScore !== undefined && <>{' | '}</>}
      </>
    )}
    {riskScore !== undefined && (
      <>
        <strong>
          {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.riskScoreLabel', {
            defaultMessage: 'Risk Score:',
          })}
        </strong>{' '}
        {riskScore}
      </>
    )}
  </EuiText>
);

interface RuleInlineContentProps extends AttachmentRenderProps<RuleAttachment> {
  aiRuleCreation: AiRuleCreationService;
  application: ApplicationStart;
  uiSettings: IUiSettingsClient;
  callbacks?: InlineRenderCallbacks;
}

export const RuleInlineContent: React.FC<RuleInlineContentProps> = ({
  attachment,
  aiRuleCreation,
  application,
  uiSettings,
  callbacks,
}) => {
  const isDirty = useObservable(aiRuleCreation.dirty$, false);
  const isSaving = useObservable(aiRuleCreation.saving$, false);
  // Seed with the synchronous getter so the first render (and the first run of the
  // register-buttons effect) sees the actual current value, not the `null` initial that
  // useObservable returns before its own subscribe effect fires. This is critical for the
  // frozen label below — without it, a card mounted after a save would briefly see
  // lastSavedRuleId === null and freeze the wrong label.
  const lastSavedRuleId = useObservable(
    aiRuleCreation.lastSavedRuleId$,
    aiRuleCreation.getLastSavedRuleId()
  );
  // Synchronous initial values avoid a one-render lag (useObservable subscribes in an effect,
  // so without this it would render the default on the first render even if the
  // BehaviorSubject already holds a non-default value).
  const currentSeq = useObservable(
    aiRuleCreation.currentAttachmentSeq$,
    aiRuleCreation.getCurrentAttachmentSeq()
  );
  const agentBusy = useObservable(aiRuleCreation.agentBusy$, false);

  const rule = useMemo(() => parseRuleFromAttachment(attachment), [attachment]);

  // Claim a sequence number on mount. useState's lazy initializer runs once per component
  // lifecycle, so each card receives a unique, monotonically increasing seq. Cards in chat
  // mount oldest → newest, so the newest card ends up with the highest seq and is "current".
  const [mySeq] = useState(() => aiRuleCreation.claimAsCurrentAttachment());

  // Only the card with the highest seq exposes action buttons, and only when the agent isn't
  // currently in a reasoning/streaming round (which would cause buttons to flicker as
  // transient events arrive). All other cards are display-only.
  const isCurrentAttachment = mySeq === currentSeq;
  const showButtons = isCurrentAttachment && !agentBusy;

  // Per-card frozen save-button label. Captured the first time this card registers buttons
  // and never updated afterwards, so user actions that mutate the attachment in place
  // (e.g. clicking "Save rule" → save_rule_handler adds a new attachment version on the same
  // attachment id, which reuses this React instance) cannot change the label on a card that
  // is already mounted. Only a brand-new card from a subsequent agent round — which mounts
  // a new RuleInlineContent instance — gets a fresh frozen label reflecting the post-save
  // state.
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
    // Disabled while saving, or after a successful save until the agent makes a change.
    // savedRuleId === undefined means the rule has never been saved — always enabled.
    const isClean = savedRuleId !== undefined && !isDirty;
    // Freeze the label on first registration based on whether a saved rule exists *at the
    // moment this card was created*. Cards created pre-first-save show "Save rule" forever;
    // cards created after any save (i.e. the next attachment rendered by the agent) show
    // "Save changes" forever. The disabled state still toggles dynamically via isClean.
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

  if (!rule) {
    return <EmptyRuleContent />;
  }

  const query = 'query' in rule ? rule.query : undefined;
  const index = 'index' in rule ? (rule.index as string[] | undefined) : undefined;
  const filters = 'filters' in rule ? (rule.filters as unknown[] | undefined) : undefined;
  const interval = 'interval' in rule ? rule.interval : undefined;
  const from = 'from' in rule ? rule.from : undefined;

  return (
    <EuiPanel paddingSize="m" hasShadow={false} hasBorder={false}>
      {isSaving ? (
        <>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.savingText', {
                  defaultMessage: 'Saving…',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      ) : (
        !isCurrentAttachment &&
        isDirty && (
          <>
            <EuiBadge color="warning">
              {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.modifiedBadge', {
                defaultMessage: 'Modified',
              })}
            </EuiBadge>
            <EuiSpacer size="s" />
          </>
        )
      )}
      {rule.type && (
        <EuiText size="s">
          <strong>
            {RULE_TYPE_FIELD_LABEL}
            {':'}
          </strong>{' '}
          {getRuleTypeLabel(rule.type)}
        </EuiText>
      )}

      {rule.description && (
        <>
          <EuiSpacer size="s" />
          <SectionHeading>
            {i18n.translate(
              'xpack.securitySolution.agentBuilder.ruleAttachment.descriptionHeading',
              { defaultMessage: 'Description' }
            )}
          </SectionHeading>
          <EuiSpacer size="xs" />
          <EuiText size="s">{rule.description}</EuiText>
        </>
      )}

      {query && (
        <>
          <EuiSpacer size="s" />
          <SectionHeading>{getQueryLabel(rule)}</SectionHeading>
          <EuiSpacer size="xs" />
          <EuiCodeBlock
            language="esql"
            fontSize="s"
            paddingSize="s"
            overflowHeight={150}
            isCopyable
          >
            {query}
          </EuiCodeBlock>
        </>
      )}

      {index && index.length > 0 && (
        <>
          <EuiSpacer size="xs" />
          <IndexPatterns patterns={index} />
        </>
      )}

      {filters && filters.length > 0 && (
        <>
          <EuiSpacer size="xs" />
          <FiltersDisplay filters={filters} />
        </>
      )}

      <EuiSpacer size="xs" />
      <RuleTypeDetails rule={rule} />

      {rule.tags && rule.tags.length > 0 && (
        <>
          <EuiSpacer size="xs" />
          <SectionHeading>
            {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.tagsHeading', {
              defaultMessage: 'Tags',
            })}
          </SectionHeading>
          <EuiSpacer size="xs" />
          <TagsBadgeList tags={rule.tags} />
        </>
      )}

      <EuiSpacer size="xs" />
      <SeverityRiskScore severity={rule.severity} riskScore={rule.risk_score} />

      {interval && (
        <>
          <EuiSpacer size="xs" />
          <ScheduleDisplay interval={interval} from={from} />
        </>
      )}

      <EuiSpacer size="s" />
      <EuiCallOut
        size="s"
        color="primary"
        iconType="info"
        title={i18n.translate(
          'xpack.securitySolution.agentBuilder.ruleAttachment.limitationsTitle',
          { defaultMessage: 'AI rule creation limitations' }
        )}
      >
        <EuiText size="xs">
          {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.limitationsBody', {
            defaultMessage:
              'Only ES|QL rules are supported. Requires existing index data. Severity and risk score default to Low / 21 — ask the assistant to change them.',
          })}
        </EuiText>
      </EuiCallOut>
    </EuiPanel>
  );
};
