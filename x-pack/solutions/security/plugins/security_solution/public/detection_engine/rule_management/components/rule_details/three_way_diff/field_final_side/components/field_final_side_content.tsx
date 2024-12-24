/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { EuiButtonEmpty, EuiCallOut, EuiFlexGroup } from '@elastic/eui';
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
          <ErrorBoundary key="readonly" fallback={READONLY_ERROR_FALLBACK}>
            <FieldFinalReadOnly />
          </ErrorBoundary>
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
          <ErrorBoundary key="edit" fallback={EDIT_ERROR_FALLBACK}>
            <FieldFinalEdit />
          </ErrorBoundary>
        </>
      );
    default:
      return assertUnreachable(rightSideMode);
  }
}

const READONLY_ERROR_FALLBACK = (
  <EuiCallOut title={i18n.READONLY_MODE_ERROR_FALLBACK_TITLE} color="danger" iconType="error">
    <p>{i18n.READONLY_MODE_ERROR_FALLBACK_DESCRIPTION}</p>
  </EuiCallOut>
);

const EDIT_ERROR_FALLBACK = (
  <EuiCallOut title={i18n.EDIT_MODE_ERROR_FALLBACK_TITLE} color="danger" iconType="error">
    <p>{i18n.EDIT_MODE_ERROR_FALLBACK_DESCRIPTION}</p>
  </EuiCallOut>
);
