/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  useEuiTheme,
} from '@elastic/eui';
import type { ApprovalModalProps } from './types';
import { ApprovalModalHeader } from './approval_modal_header';
import { BlastRadiusSection } from './blast_radius_section';
import { ApprovalActorRow } from './approval_actor_row';
import { AlwaysAllowCheckbox } from './always_allow_checkbox';
import { useApprovalTone } from './use_approval_tone';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';

const TITLE_ID = 'approvalModalTitle';

export const ApprovalModal = memo<ApprovalModalProps>(
  ({
    tone = 'primary',
    iconType,
    warningLabel,
    title,
    blastRadius,
    actor,
    alwaysAllow,
    onConfirm,
    cancelLabel,
    onClose,
    'data-test-subj': dataTestSubj,
  }) => {
    const { buttonColor, iconColor } = useApprovalTone(tone);
    const { euiTheme } = useEuiTheme();

    return (
      <EuiModal
        aria-labelledby={TITLE_ID}
        onClose={onClose}
        css={css({ maxWidth: 560, width: '100%', borderRadius: euiTheme.size.m })}
        data-test-subj={dataTestSubj}
      >
        <ApprovalModalHeader
          tone={tone}
          iconType={iconType}
          warningLabel={warningLabel ?? APPROVAL_MODAL_TRANSLATIONS.warningLabel}
          title={title}
          titleId={TITLE_ID}
        />

        <EuiModalBody css={css({ padding: `${euiTheme.size.m} 0` })}>
          <BlastRadiusSection content={blastRadius} defaultItemIconColor={iconColor} />
          {actor && <ApprovalActorRow actor={actor} />}
        </EuiModalBody>

        {alwaysAllow && (
          <AlwaysAllowCheckbox
            option={alwaysAllow}
            data-test-subj={dataTestSubj ? `${dataTestSubj}-always-allow` : undefined}
          />
        )}

        <EuiModalFooter
          css={css({
            justifyContent: 'flex-start',
            padding: euiTheme.size.m,
            borderTop: `1px solid ${euiTheme.colors.lightestShade}`,
          })}
        >
          <EuiButton
            fill
            size="s"
            color={buttonColor}
            iconType={iconType}
            onClick={onConfirm}
            data-test-subj={dataTestSubj ? `${dataTestSubj}-confirm` : undefined}
          >
            {title}
          </EuiButton>
          <EuiButtonEmpty
            size="s"
            color="text"
            onClick={onClose}
            data-test-subj={dataTestSubj ? `${dataTestSubj}-cancel` : undefined}
          >
            {cancelLabel ?? APPROVAL_MODAL_TRANSLATIONS.cancel}
          </EuiButtonEmpty>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);

ApprovalModal.displayName = 'ApprovalModal';
