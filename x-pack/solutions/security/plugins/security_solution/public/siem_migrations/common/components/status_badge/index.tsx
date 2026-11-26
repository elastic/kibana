/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiIcon, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/css';
import { MigrationTranslationResult } from '../../../../../common/siem_migrations/constants';
import type { MigrationTranslationResult as MigrationTranslationResultType } from '../../../../../common/siem_migrations/model/common.gen';
import { convertTranslationResultIntoText, useResultVisColors } from '../../utils';
import * as i18n from './translations';

const statusTextWrapperClassName = css`
  width: 100%;
  display: inline-grid;
`;

export interface StatusBadgeProps {
  /** The item was installed, it has an Elastic counterpart */
  isInstalled: boolean;
  /** The translation of the item failed */
  isFailed: boolean;
  translationResult?: MigrationTranslationResultType;
  /** Why the translation failed, shown on hover, e.g. the first comment of the item */
  failedMessage?: string;
  /** How a failed item is labelled, "Failed" by default */
  failedLabel?: string;
  'data-test-subj'?: string;
}

/**
 * The translation status of a migrated item (rule, dashboard, workflow...): installed, failed,
 * or the result of the translation. It only knows the facts about the item, not its type.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = React.memo(
  ({
    isInstalled,
    isFailed,
    translationResult = MigrationTranslationResult.UNTRANSLATABLE,
    failedMessage,
    failedLabel = i18n.STATUS_FAILED,
    'data-test-subj': dataTestSubj = 'translation-result',
  }) => {
    const colors = useResultVisColors();

    if (isInstalled) {
      return (
        <EuiToolTip data-test-subj="installedStatusTooltip" content={i18n.STATUS_INSTALLED}>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon
                type="check"
                color={colors[MigrationTranslationResult.FULL]}
                aria-hidden={true}
              />
            </EuiFlexItem>
            <EuiFlexItem data-test-subj={dataTestSubj} grow={false}>
              {i18n.STATUS_INSTALLED}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiToolTip>
      );
    }

    if (isFailed) {
      return (
        <EuiToolTip data-test-subj="failedStatusTooltip" content={failedMessage ?? failedLabel}>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="warningFill" color="danger" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem data-test-subj={dataTestSubj} grow={false}>
              {failedLabel}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiToolTip>
      );
    }

    const displayValue = convertTranslationResultIntoText(translationResult);

    return (
      <EuiToolTip data-test-subj="translationStatusTooltip" content={displayValue}>
        <EuiHealth color={colors[translationResult]} data-test-subj={dataTestSubj}>
          <div className={statusTextWrapperClassName}>
            <span className="eui-textTruncate">{displayValue}</span>
          </div>
        </EuiHealth>
      </EuiToolTip>
    );
  }
);
StatusBadge.displayName = 'StatusBadge';
