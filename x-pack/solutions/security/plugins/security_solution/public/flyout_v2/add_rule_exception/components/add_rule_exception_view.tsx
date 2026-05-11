/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlyoutBody, EuiSkeletonText } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import { getFieldValue } from '@kbn/discover-utils';
import type { Status } from '../../../../common/api/detection_engine';
import { AddExceptionFlyoutContent } from '../../../detection_engine/rule_exceptions/components/add_exception_flyout';
import type { AlertData } from '../../../detection_engine/rule_exceptions/utils/types';
import { useRuleForHit } from '../hooks/use_rule_for_hit';
import { ADD_RULE_EXCEPTION_LOADING_TEST_ID } from '../test_ids';

export interface AddRuleExceptionViewProps {
  /**
   * Alert document to seed the exception form with.
   */
  hit: DataTableRecord;
  /**
   * The exception list type that controls whether the form creates a rule exception
   * or an endpoint exception. `null` is treated as a default rule exception.
   */
  exceptionListType: ExceptionListTypeEnum | null;
  /**
   * Invoked when the user cancels.
   */
  onCancel: (didRuleChange: boolean) => void;
  /**
   * Invoked when the user successfully creates an exception.
   */
  onConfirm: (
    didRuleChange: boolean,
    didCloseAlert: boolean,
    didBulkCloseAlert: boolean
  ) => void;
}

/**
 * Renders the body and footer for the Add Rule / Endpoint exception form inside Flyout v2.
 * Resolves the rule and shapes alert data from a `DataTableRecord`, then delegates to
 * the shared `AddExceptionFlyoutContent` component (which owns the form's reducer and chrome
 * inside an `EuiFlyoutBody` + `EuiFlyoutFooter`).
 */
export const AddRuleExceptionView: React.FC<AddRuleExceptionViewProps> = memo(
  ({ hit, exceptionListType, onCancel, onConfirm }) => {
    const { rules, loading: isRuleLoading } = useRuleForHit(hit);

    const alertData = useMemo<AlertData | undefined>(() => {
      const { _id, _index, _source } = hit.raw;
      if (!_source) return undefined;
      return { ...(_source as object), _id, _index } as AlertData;
    }, [hit]);

    const alertStatus = useMemo<Status | undefined>(() => {
      const raw = getFieldValue(hit, ALERT_WORKFLOW_STATUS);
      const value = Array.isArray(raw) ? raw[0] : raw;
      return value as Status | undefined;
    }, [hit]);

    const isEndpointItem = exceptionListType === ExceptionListTypeEnum.ENDPOINT;

    if (isRuleLoading || alertData == null) {
      return (
        <EuiFlyoutBody data-test-subj={ADD_RULE_EXCEPTION_LOADING_TEST_ID}>
          <EuiSkeletonText lines={4} />
        </EuiFlyoutBody>
      );
    }

    return (
      <AddExceptionFlyoutContent
        rules={rules}
        isEndpointItem={isEndpointItem}
        alertData={alertData}
        isAlertDataLoading={false}
        alertStatus={alertStatus}
        isBulkAction={false}
        showAlertCloseOptions
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );
  }
);

AddRuleExceptionView.displayName = 'AddRuleExceptionView';
