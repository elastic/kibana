/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  useEuiTheme,
} from '@elastic/eui';
import type { Investigation } from '@kbn/pnd-common';
import { ApprovalModalHeader } from './approval_modal_header';
import { BlastRadiusSection } from './blast_radius_section';
import { ApprovalActorRow } from './approval_actor_row';
import { AlwaysAllowCheckbox } from './always_allow_checkbox';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';
import { getActionButtonIconProps } from '../../helpers';

const TITLE_ID = 'approvalModalTitle';

export interface ApprovalModalProps {
  alwaysAllow?: {
    id: string;
    label: React.ReactNode;
    checked: boolean;
    onChange: (checked: boolean) => void;
  };
  selectedRecommendedActionConversation?: Investigation;
  onConfirm: () => void;
  onClose: () => void;
  'data-test-subj'?: string;
}

export const ApprovalModal = memo<ApprovalModalProps>(
  ({
    alwaysAllow,
    selectedRecommendedActionConversation,
    onConfirm,
    onClose,
    'data-test-subj': dataTestSubj,
  }) => {
    const { euiTheme } = useEuiTheme();

    const title = selectedRecommendedActionConversation?.primaryActionLabel ?? '';

    const recommendedActionIconProps = useMemo(
      () =>
        selectedRecommendedActionConversation
          ? getActionButtonIconProps(selectedRecommendedActionConversation)
          : { type: 'gear' as const, color: 'primary' as const },
      [selectedRecommendedActionConversation]
    );

    const { buttonColor, iconColor } = useMemo(
      () =>
        recommendedActionIconProps.color === 'danger'
          ? { buttonColor: 'danger' as const, iconColor: euiTheme.colors.danger }
          : { buttonColor: 'primary' as const, iconColor: euiTheme.colors.primary },
      [recommendedActionIconProps.color, euiTheme.colors.danger, euiTheme.colors.primary]
    );

    return (
      <EuiModal
        aria-labelledby={TITLE_ID}
        onClose={onClose}
        css={css({ maxWidth: 560, width: '100%', borderRadius: euiTheme.size.m })}
        data-test-subj={dataTestSubj}
      >
        <ApprovalModalHeader
          tone={recommendedActionIconProps.color === 'danger' ? 'danger' : 'primary'}
          iconType={recommendedActionIconProps.type}
          warningLabel={APPROVAL_MODAL_TRANSLATIONS.warningLabel}
          title={title}
          titleId={TITLE_ID}
        />

        <EuiModalBody css={css({ padding: `${euiTheme.size.m} 0` })}>
          <BlastRadiusSection
            content={{
              variant: 'description',
              description: selectedRecommendedActionConversation?.summary ?? '',
            }}
            defaultItemIconColor={iconColor}
          />
          <ApprovalActorRow />
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
            iconType={recommendedActionIconProps.type}
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
            {APPROVAL_MODAL_TRANSLATIONS.cancel}
          </EuiButtonEmpty>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);

ApprovalModal.displayName = 'ApprovalModal';
