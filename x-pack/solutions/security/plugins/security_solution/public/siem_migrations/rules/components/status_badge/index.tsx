/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiIcon, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/css';
import { RuleTranslationResult } from '../../../../../common/siem_migrations/constants';
import {
  convertTranslationResultIntoText,
  useResultVisColors,
} from '../../utils/translation_results';
import {
  RuleMigrationStatusEnum,
  type RuleMigration,
} from '../../../../../common/siem_migrations/model/rule_migration.gen';
import * as i18n from './translations';

const statusTextWrapperClassName = css`
  width: 100%;
  display: inline-grid;
`;

interface StatusBadgeProps {
  migrationRule: RuleMigration;
  'data-test-subj'?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = React.memo(
  ({ migrationRule, 'data-test-subj': dataTestSubj = 'translation-result' }) => {
    const colors = useResultVisColors();
    // Installed
    if (migrationRule.elastic_rule?.id) {
      return (
        <EuiToolTip content={i18n.RULE_STATUS_INSTALLED}>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="check" color={colors[RuleTranslationResult.FULL]} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{i18n.RULE_STATUS_INSTALLED}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiToolTip>
      );
    }

    // Failed
    if (migrationRule.status === RuleMigrationStatusEnum.failed) {
      return (
        <EuiToolTip content={i18n.RULE_STATUS_FAILED}>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="warningFilled" color="danger" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{i18n.RULE_STATUS_FAILED}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiToolTip>
      );
    }

    const translationResult = migrationRule.translation_result ?? 'untranslatable';
    const displayValue = convertTranslationResultIntoText(translationResult);
    const color = colors[translationResult];

    return (
      <EuiToolTip content={displayValue}>
        <EuiHealth color={color} data-test-subj={dataTestSubj}>
          <div className={statusTextWrapperClassName}>
            <span className="eui-textTruncate">{displayValue}</span>
          </div>
        </EuiHealth>
      </EuiToolTip>
    );
  }
);
StatusBadge.displayName = 'StatusBadge';
