/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiIcon, EuiToolTip } from '@elastic/eui';
import type { WorkflowMigrationWorkflow } from '../../../../../common/siem_migrations/model/workflow_migration.gen';
import {
  MigrationTranslationResult,
  SiemMigrationStatus,
} from '../../../../../common/siem_migrations/constants';
import {
  convertTranslationResultIntoText,
  useResultVisColors,
} from '../../../common/utils/translation_results';
import * as i18n from './translations';

interface StatusBadgeProps {
  workflow: WorkflowMigrationWorkflow;
  'data-test-subj'?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = React.memo(
  ({ workflow, 'data-test-subj': dataTestSubj = 'translation-result' }) => {
    const colors = useResultVisColors();

    if (workflow.status === SiemMigrationStatus.FAILED) {
      const tooltipMessage = workflow.comments?.length
        ? workflow.comments[0].message
        : i18n.WORKFLOW_STATUS_ERROR;
      return (
        <EuiToolTip data-test-subj="failedStatusTooltip" content={tooltipMessage}>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="warningFill" color="danger" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem data-test-subj={dataTestSubj} grow={false}>
              {i18n.WORKFLOW_STATUS_ERROR}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiToolTip>
      );
    }

    const translationResult =
      workflow.translation_result ?? MigrationTranslationResult.UNTRANSLATABLE;
    const displayValue = convertTranslationResultIntoText(translationResult);

    return (
      <EuiHealth color={colors[translationResult]} data-test-subj={dataTestSubj}>
        {displayValue}
      </EuiHealth>
    );
  }
);
StatusBadge.displayName = 'StatusBadge';
