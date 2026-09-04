/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiText,
  EuiTextArea,
  useEuiTheme,
} from '@elastic/eui';
import type { PndDiscoveryContext, PndProposalRow } from '@kbn/pnd-common';
import { ApprovalModalHeader } from './approval_modal_header';
import { BlastRadiusSection } from './blast_radius_section';
import { ApprovalActorRow } from './approval_actor_row';
import { AlwaysAllowCheckbox } from './always_allow_checkbox';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';
import { getActionButtonIconProps } from '../../helpers';
import { primaryActionLabel } from '../../conversation_card/helpers/primary_action_label';
import { CONVERSATION_CARD_ACTIONS } from '../../conversation_card/translations';
import { RecommendedActions } from '../../recommended_actions';
import {
  parseRecommendedActions,
  stripRecommendedActionsJson,
} from '../../../pages/conversations/helpers/parse_recommended_actions';

const TITLE_ID = 'approvalModalTitle';

export type ApprovalModalDecision = 'approve' | 'dismiss';

export interface ApprovalModalProps {
  alwaysAllow?: {
    checked: boolean;
    id: string;
    label: React.ReactNode;
    onChange: (checked: boolean) => void;
  };
  decision: ApprovalModalDecision;
  discoveryContext?: PndDiscoveryContext;
  errorMessage?: string;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: (input: Record<string, unknown>) => void;
  proposal: PndProposalRow;
  'data-test-subj'?: string;
}

export const ApprovalModal = memo<ApprovalModalProps>(
  ({
    alwaysAllow,
    decision,
    discoveryContext,
    errorMessage,
    isLoading = false,
    onClose,
    onConfirm,
    proposal,
    'data-test-subj': dataTestSubj,
  }) => {
    const { euiTheme } = useEuiTheme();
    const [rationale, setRationale] = useState('');

    const title =
      decision === 'dismiss'
        ? APPROVAL_MODAL_TRANSLATIONS.dismissTitle
        : primaryActionLabel(proposal.gateId) ?? CONVERSATION_CARD_ACTIONS.default;

    const recommendedActionIconProps = useMemo(
      () =>
        getActionButtonIconProps({
          recommendedAction: proposal.recommendedAction,
        }),
      [proposal.recommendedAction]
    );

    const { buttonColor, iconColor } = useMemo(
      () =>
        decision === 'dismiss' || recommendedActionIconProps.color === 'danger'
          ? { buttonColor: 'danger' as const, iconColor: euiTheme.colors.danger }
          : { buttonColor: 'primary' as const, iconColor: euiTheme.colors.primary },
      [decision, recommendedActionIconProps.color, euiTheme.colors.danger, euiTheme.colors.primary]
    );

    const blastRadiusItems = (discoveryContext?.entities ?? []).map(({ field, value }) => ({
      iconType: 'dot' as const,
      id: `${field}:${value}`,
      text: <span data-test-subj="hitlActionCardEntity">{value}</span>,
    }));

    // The containment the forensics recommended rides in `reasoning` as a label-anchored JSON
    // array, so the prose above the list has to drop it: rendering the raw array is the one
    // thing on the card no analyst can read. `undefined` on any parse failure leaves the
    // summary exactly as it arrived.
    const recommendedActions = useMemo(
      () => parseRecommendedActions(proposal.reasoning),
      [proposal.reasoning]
    );

    const reasoningProse = useMemo(
      () => (proposal.reasoning != null ? stripRecommendedActionsJson(proposal.reasoning) : ''),
      [proposal.reasoning]
    );

    const blastRadiusDescription =
      blastRadiusItems.length === 0 ? proposal.message ?? reasoningProse : undefined;

    const onSubmit = useCallback(() => {
      if (rationale.trim().length === 0) {
        return;
      }

      onConfirm({ decision, rationale: rationale.trim() });
    }, [decision, onConfirm, rationale]);

    return (
      <EuiModal
        aria-labelledby={TITLE_ID}
        css={css({ borderRadius: euiTheme.size.m, maxWidth: 560, width: '100%' })}
        data-test-subj={dataTestSubj}
        onClose={onClose}
      >
        <ApprovalModalHeader
          iconType={recommendedActionIconProps.type}
          title={title}
          titleId={TITLE_ID}
          tone={buttonColor === 'danger' ? 'danger' : 'primary'}
          warningLabel={APPROVAL_MODAL_TRANSLATIONS.warningLabel}
        />

        <EuiModalBody css={css({ padding: `${euiTheme.size.m} 0` })}>
          {errorMessage != null && errorMessage.length > 0 ? (
            <EuiCallOut
              announceOnMount
              color="danger"
              data-test-subj="hitlActionCardError"
              size="s"
              title={errorMessage}
            />
          ) : null}
          {reasoningProse.length > 0 ? (
            <EuiText
              css={css({ padding: `0 ${euiTheme.size.m} ${euiTheme.size.m}` })}
              data-test-subj="hitlActionCardReasoning"
              size="s"
            >
              <p>{reasoningProse}</p>
            </EuiText>
          ) : null}
          {recommendedActions != null ? <RecommendedActions actions={recommendedActions} /> : null}
          <BlastRadiusSection
            content={
              blastRadiusItems.length > 0
                ? { items: blastRadiusItems, variant: 'list' }
                : { description: blastRadiusDescription, variant: 'description' }
            }
            defaultItemIconColor={iconColor}
          />
          <ApprovalActorRow />
          <EuiFormRow
            css={css({ marginTop: euiTheme.size.m, padding: `0 ${euiTheme.size.m}` })}
            fullWidth
            label={APPROVAL_MODAL_TRANSLATIONS.rationaleLabel}
          >
            <EuiTextArea
              data-test-subj={dataTestSubj ? `${dataTestSubj}-rationale` : undefined}
              fullWidth
              onChange={(event) => setRationale(event.target.value)}
              value={rationale}
            />
          </EuiFormRow>
        </EuiModalBody>

        {alwaysAllow && (
          <AlwaysAllowCheckbox
            data-test-subj={dataTestSubj ? `${dataTestSubj}-always-allow` : undefined}
            option={alwaysAllow}
          />
        )}

        <EuiModalFooter
          css={css({
            borderTop: `1px solid ${euiTheme.colors.lightestShade}`,
            justifyContent: 'flex-start',
            padding: euiTheme.size.m,
          })}
        >
          <EuiButton
            color={buttonColor}
            data-test-subj={dataTestSubj ? `${dataTestSubj}-confirm` : undefined}
            fill
            iconType={recommendedActionIconProps.type}
            isDisabled={rationale.trim().length === 0}
            isLoading={isLoading}
            onClick={onSubmit}
            size="s"
          >
            {title}
          </EuiButton>
          <EuiButtonEmpty
            color="text"
            data-test-subj={dataTestSubj ? `${dataTestSubj}-cancel` : undefined}
            onClick={onClose}
            size="s"
          >
            {APPROVAL_MODAL_TRANSLATIONS.cancel}
          </EuiButtonEmpty>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);

ApprovalModal.displayName = 'ApprovalModal';
