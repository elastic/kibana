/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiModal, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/react';

import { HitlActionCard } from '..';
import type { HitlActionCardProps } from '..';

const MODAL_WIDTH_PX = 640;

export type HitlActionModalProps = Omit<HitlActionCardProps, 'titleId'>;

/**
 * Where an analyst answers a gate: {@link HitlActionCard} in a modal.
 *
 * The modal is chrome and nothing else — no header, no footer, no close icon,
 * no background of its own. The card already draws a header, a tone-coloured
 * border and its own footer buttons, and a dialog frame around all of that
 * would be two nested cards. Closing is the card's Cancel button, the Escape
 * key, or a click outside.
 *
 * Presentational: the page owns `useRespondToProposal`, the success and 409
 * toasts, and the second call a `tune` approval needs. `onConfirm` receives the
 * gate's answer exactly as it should reach `_respond` as its `input`.
 */
export const HitlActionModal: React.FC<HitlActionModalProps> = ({
  discoveryContext,
  errorMessage,
  isLoading = false,
  onCancel,
  onConfirm,
  proposal,
}) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'hitlActionCardTitle' });

  // The height cap is what arms the card's internal scroll: the card is a flex
  // column whose middle region scrolls at max-height 100%, so without a bound
  // here a long staged-action list would grow the dialog past the viewport and
  // put the footer buttons (and the toggles) out of reach.
  const modalStyles = css`
    background: transparent;
    block-size: auto;
    border: none;
    box-shadow: none;
    display: flex;
    flex-direction: column;
    inline-size: ${MODAL_WIDTH_PX}px;
    max-block-size: calc(100vh - ${euiTheme.size.xxl});
    max-inline-size: calc(100vw - ${euiTheme.size.xl});

    .euiModal__closeIcon {
      display: none;
    }
  `;

  return (
    <EuiModal
      aria-labelledby={titleId}
      css={modalStyles}
      data-test-subj="hitlActionModal"
      onClose={onCancel}
    >
      <HitlActionCard
        discoveryContext={discoveryContext}
        errorMessage={errorMessage}
        isLoading={isLoading}
        onCancel={onCancel}
        onConfirm={onConfirm}
        proposal={proposal}
        titleId={titleId}
      />
    </EuiModal>
  );
};
