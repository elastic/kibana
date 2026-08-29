/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiCallOut, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { PND_GATE_IDS } from '@kbn/pnd-common';
import type { PndDiscoveryContext, PndProposalRow } from '@kbn/pnd-common';

import {
  parseRecommendedActions,
  stripRecommendedActionsJson,
} from '../../pages/conversations/helpers/parse_recommended_actions';
import {
  canRenderWithSchemaForm,
  extractSchemaDefaults,
  SchemaForm,
  validateSchemaValues,
} from '../hitl_schema_form';
import { BlastRadiusLines } from './blast_radius_lines';
import { FixedDecisionForm } from './fixed_decision_form';
import { getHitlActionIcon } from './helpers/get_hitl_action_icon';
import { getHitlTone } from './helpers/get_hitl_tone';
import { getHitlToneTokens } from './helpers/get_hitl_tone_tokens';
import {
  FIXED_DECISION_NAME,
  validateFixedDecisionValues,
} from './helpers/validate_fixed_decision_values';
import {
  APPROVED_ACTIONS_NAME,
  RecommendedActionsDecisionForm,
} from './recommended_actions_decision_form';
import * as i18n from './translations';

const HEADER_ICON_SIZE_PX = 36;

export interface HitlActionCardProps {
  /**
   * The blast radius and risk for this proposal's Attack Discovery, taken from
   * the page's own `discovery-context` read rather than fetched again: the
   * chips, the risk badge and this card share **one** react-query key (D10).
   *
   * Legitimately absent for an uncorrelated run, a discovery the caller cannot
   * read, or one whose alerts have aged out.
   */
  discoveryContext?: PndDiscoveryContext;
  /** A server error (400 / 403 / 409) from `_respond`, rendered in place. */
  errorMessage?: string;
  isLoading?: boolean;
  onCancel: () => void;
  /**
   * The gate's answer, exactly as it should reach `_respond` as its `input`.
   * Forwarded verbatim: the route's `.catchall(z.unknown())` hands whatever a
   * gate's own schema asked for to the orchestrator untouched (G7).
   */
  onConfirm: (input: Record<string, unknown>) => void;
  proposal: PndProposalRow;
  /** Set by a modal host that labels its dialog with this card's title. */
  titleId?: string;
}

/**
 * The "Approval required" card — where every PND approve/dismiss decision is
 * now made, ported from the prototype's `HitlActionCard` at `10e153f`.
 *
 * Two things about it are load-bearing:
 *
 * **The decision is a form field, not a button.** The gate's own `inputSchema`
 * says what answering it means, so the footer's primary action submits whatever
 * the analyst chose rather than hard-coding "approve" — and it renames itself
 * accordingly, because a button reading "Approve" that dismisses the proposal is
 * the sharpest version of a UI lying about what it is about to do.
 *
 * **It renders three branches.** An `incident_contained` gate whose reasoning
 * carries staged containment actions behind the label anchor is drawn by
 * `RecommendedActionsDecisionForm`; otherwise a gate whose schema
 * `canRenderWithSchemaForm` accepts is drawn by `SchemaForm`; anything else —
 * including the `{}` every row carries when its gate declared no schema — falls
 * back to fixed controls. All three report the same value map, so submission
 * does not know which one it drew. The first branch is fail-closed too: a
 * Phase-3 row whose summary lost the anchor falls back to the fixed controls,
 * where approving carries no `approved_actions` and the workflow executes
 * nothing.
 *
 * The prototype renders `item.html`, `operatorNote` and `alwaysAllowHtml`
 * through `dangerouslySetInnerHTML`. None of that is ported: every string here
 * is model- or workflow-authored, and it is rendered as text.
 */
export const HitlActionCard: React.FC<HitlActionCardProps> = ({
  discoveryContext,
  errorMessage,
  isLoading = false,
  onCancel,
  onConfirm,
  proposal,
  titleId,
}) => {
  const { euiTheme } = useEuiTheme();
  const {
    gateId,
    inputSchema,
    message,
    reasoning,
    recommendedAction,
    reversible,
    threadTitle,
    title,
  } = proposal;

  const tokens = getHitlToneTokens(getHitlTone({ recommendedAction, reversible }), euiTheme.colors);

  // The staged containment actions the Watch Floor wrote into the Phase-3
  // gate's reasoning summary behind the label anchor. `undefined` on every
  // other gate, and on a summary that lost the anchor — both fall through to
  // the two branches below, where nothing can be toggled on.
  const recommendedActions = useMemo(
    () =>
      gateId === PND_GATE_IDS.incidentContained ? parseRecommendedActions(reasoning) : undefined,
    [gateId, reasoning]
  );

  // The toggle rows below render the staged actions, so the reasoning shown above
  // them is the prose alone — the raw JSON block is stripped on exactly the rows
  // where the dedicated form drew it. Every other branch shows the summary as-is.
  const displayReasoning = useMemo(
    () => (recommendedActions != null ? stripRecommendedActionsJson(reasoning) : reasoning),
    [recommendedActions, reasoning]
  );

  // The guard is the only supported way to narrow a row's `inputSchema`, and it
  // is fail-closed: every `false`, `{}` included, means the fallback branch.
  // The recommended-actions branch takes precedence — its gate declares a
  // schema too, but only the dedicated form can echo the staged actions back.
  const schema =
    recommendedActions == null && canRenderWithSchemaForm(inputSchema) ? inputSchema : undefined;

  const [values, setValues] = useState<Record<string, unknown>>(() => {
    // Seeded empty rather than absent, so an approval that toggles nothing on
    // still says so explicitly instead of leaving the key to a server default.
    if (recommendedActions != null) return { [APPROVED_ACTIONS_NAME]: [] };

    return schema != null ? extractSchemaDefaults(schema) : {};
  });

  const errors = useMemo(
    () =>
      schema != null ? validateSchemaValues(schema, values) : validateFixedDecisionValues(values),
    [schema, values]
  );

  const isAnswered = Object.keys(errors).length === 0;

  // The primary action is disabled while anything is unanswered, so this guard
  // is a second lock rather than the only one: an answer that reached `_respond`
  // without its rationale would be an unattributable decision.
  const onSubmit = useCallback(() => {
    if (!isAnswered) return;

    onConfirm(values);
  }, [isAnswered, onConfirm, values]);

  // The chosen decision drives the footer label, on either branch: `decision` is
  // the key `_respond` requires, so it is the key both forms report under. The
  // enum is closed server-side (security finding D2), and anything outside it —
  // including nothing chosen yet — reads as a plain submit rather than being
  // announced as an approval.
  const decision = values[FIXED_DECISION_NAME];
  const submitLabel =
    decision === 'approve' ? i18n.APPROVE : decision === 'dismiss' ? i18n.DISMISS : i18n.SUBMIT;

  // A flex column capped at its container's height: the header and footer stay
  // put and the middle region scrolls, so a long staged-action list can never
  // push the Approve/Cancel buttons (or its own toggles) off screen.
  const cardStyles = css`
    background: ${euiTheme.colors.emptyShade};
    border: 1px solid ${tokens.border};
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    max-height: 100%;
    min-height: 0;
    overflow: hidden;
    width: 100%;
  `;

  const headerStyles = css`
    align-items: center;
    background: ${tokens.headerBackground};
    border-bottom: 1px solid ${tokens.border};
    display: flex;
    flex-shrink: 0;
    gap: ${euiTheme.size.m};
    padding: ${euiTheme.size.base};
  `;

  const scrollRegionStyles = css`
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
  `;

  const headerIconStyles = css`
    align-items: center;
    background: ${tokens.iconBackground};
    border-radius: 8px;
    display: flex;
    flex-shrink: 0;
    height: ${HEADER_ICON_SIZE_PX}px;
    justify-content: center;
    width: ${HEADER_ICON_SIZE_PX}px;
  `;

  const headerMainStyles = css`
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  `;

  const eyebrowStyles = css`
    color: ${tokens.eyebrowText};
    font-size: 11px;
    font-weight: ${euiTheme.font.weight.semiBold};
    letter-spacing: 0.06em;
    line-height: 16px;
    text-transform: uppercase;
  `;

  const titleStyles = css`
    color: ${euiTheme.colors.textHeading};
    font-size: 16px;
    font-weight: ${euiTheme.font.weight.semiBold};
    line-height: 22px;
    margin: 0;
  `;

  const bodyStyles = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.base};
  `;

  const sectionLabelStyles = css`
    color: ${euiTheme.colors.textSubdued};
    font-size: 11px;
    font-weight: ${euiTheme.font.weight.semiBold};
    letter-spacing: 0.06em;
    line-height: 16px;
    text-transform: uppercase;
  `;

  const dashedRuleStyles = css`
    border: none;
    border-top: 1px dashed ${euiTheme.border.color};
    margin: ${euiTheme.size.xs} 0;
  `;

  const operatorStyles = css`
    align-items: flex-start;
    color: ${euiTheme.colors.textSubdued};
    display: flex;
    gap: ${euiTheme.size.m};
    font-size: 13px;
    line-height: 20px;
  `;

  const formStyles = css`
    border-top: 1px solid ${euiTheme.border.color};
    padding: ${euiTheme.size.base};
  `;

  const footerStyles = css`
    align-items: center;
    border-top: 1px solid ${euiTheme.border.color};
    display: flex;
    flex-shrink: 0;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.m} ${euiTheme.size.base};
  `;

  return (
    <div
      aria-label={i18n.approvalRequiredAriaLabel(threadTitle ?? title)}
      css={cardStyles}
      data-test-subj="hitlActionCard"
      role="group"
    >
      <div css={headerStyles}>
        <span css={headerIconStyles}>
          <EuiIcon
            aria-hidden={true}
            color={euiTheme.colors.emptyShade}
            type={getHitlActionIcon(recommendedAction)}
          />
        </span>
        <div css={headerMainStyles}>
          <span css={eyebrowStyles} data-test-subj="hitlActionCardEyebrow">
            {i18n.APPROVAL_REQUIRED}
          </span>
          <p css={titleStyles} data-test-subj="hitlActionCardTitle" id={titleId}>
            {threadTitle ?? title}
          </p>
        </div>
      </div>

      <div css={scrollRegionStyles} data-test-subj="hitlActionCardScrollRegion">
        <div css={bodyStyles}>
          <EuiText data-test-subj="hitlActionCardMessage" size="s">
            <p>{message}</p>
          </EuiText>

          <span css={sectionLabelStyles}>{i18n.BLAST_RADIUS}</span>
          <BlastRadiusLines
            entities={discoveryContext?.entities ?? []}
            iconColor={tokens.eyebrowText}
          />

          <hr css={dashedRuleStyles} />

          <div css={operatorStyles}>
            <EuiIcon aria-hidden={true} color="subdued" size="m" type="securitySignal" />
            {displayReasoning.trim().length > 0 ? (
              <span data-test-subj="hitlActionCardReasoning">{displayReasoning}</span>
            ) : (
              <span data-test-subj="hitlActionCardReasoningMissing">{i18n.REASONING_MISSING}</span>
            )}
          </div>
        </div>

        <div css={formStyles}>
          {recommendedActions != null ? (
            <RecommendedActionsDecisionForm
              actions={recommendedActions}
              disabled={isLoading}
              errors={errors}
              onChange={setValues}
              values={values}
            />
          ) : schema != null ? (
            <SchemaForm
              disabled={isLoading}
              errors={errors}
              onChange={setValues}
              schema={schema}
              values={values}
            />
          ) : (
            <FixedDecisionForm
              disabled={isLoading}
              errors={errors}
              onChange={setValues}
              values={values}
            />
          )}

          {errorMessage != null ? (
            <EuiCallOut
              announceOnMount
              color="danger"
              data-test-subj="hitlActionCardError"
              iconType="error"
              size="s"
              text={<p>{errorMessage}</p>}
              title={i18n.ERROR_TITLE}
            />
          ) : null}
        </div>
      </div>

      <div css={footerStyles}>
        <EuiButton
          color={tokens.buttonColor}
          data-test-subj="hitlCardApprove"
          fill
          isDisabled={isLoading || !isAnswered}
          isLoading={isLoading}
          onClick={onSubmit}
          size="s"
        >
          {submitLabel}
        </EuiButton>
        <EuiButtonEmpty
          color="text"
          data-test-subj="hitlCardCancel"
          isDisabled={isLoading}
          onClick={onCancel}
          size="s"
        >
          {i18n.CANCEL}
        </EuiButtonEmpty>
      </div>
    </div>
  );
};
