/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup } from '@elastic/eui';
import { KibanaSectionErrorBoundary } from '@kbn/shared-ux-error-boundary';
import { FieldFinalReadOnly } from '../../final_readonly';
import { FieldFinalEdit } from '../../final_edit';
import { assertUnreachable } from '../../../../../../../../common/utility_types';
import {
  FieldFinalSideMode,
  useFieldUpgradeContext,
} from '../../rule_upgrade/field_upgrade_context';
import * as i18n from './translations';

export function FieldFinalSideContent(): JSX.Element {
  const { rightSideMode, setEditMode, setReadOnlyMode } = useFieldUpgradeContext();

  switch (rightSideMode) {
    case FieldFinalSideMode.Readonly:
      return (
        <>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiButtonEmpty iconType="pencil" onClick={setEditMode}>
              {i18n.EDIT}
            </EuiButtonEmpty>
          </EuiFlexGroup>
          <KibanaSectionErrorBoundary
            key="rule-field-readonly-view"
            sectionName={i18n.READONLY_MODE}
          >
            <FieldFinalReadOnly />
          </KibanaSectionErrorBoundary>
        </>
      );
    case FieldFinalSideMode.Edit:
      return (
        <>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiButtonEmpty iconType="cross" onClick={setReadOnlyMode}>
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexGroup>
          <KibanaSectionErrorBoundary key="rule-field-editing-view" sectionName={i18n.EDIT_MODE}>
            <FieldFinalEdit />
          </KibanaSectionErrorBoundary>
        </>
      );
    default:
      return assertUnreachable(rightSideMode);
  }
}
