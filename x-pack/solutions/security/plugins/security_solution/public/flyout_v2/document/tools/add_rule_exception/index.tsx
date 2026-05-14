/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiSkeletonText } from '@elastic/eui';
import { set } from 'lodash';
import { ALERT_RULE_UUID, ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { Status } from '../../../../../common/api/detection_engine';
import { AddExceptionFlyout } from '../../../../detection_engine/rule_exceptions/components/add_exception_flyout';
import {
  ADD_ENDPOINT_EXCEPTION,
  CREATE_RULE_EXCEPTION,
} from '../../../../detection_engine/rule_exceptions/components/flyout_components/header/translations';
import type { AlertData } from '../../../../detection_engine/rule_exceptions/utils/types';
import type { Rule } from '../../../../detection_engine/rule_management/logic/types';
import { useRuleWithFallback } from '../../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { EndpointExceptionsFlyout } from '../../../../management/pages/endpoint_exceptions/view/components/endpoint_exceptions_flyout';
import { ToolsFlyoutHeader } from '../../../shared/components/tools_flyout_header';
import { ADD_RULE_EXCEPTION_LOADING_TEST_ID, ADD_RULE_EXCEPTION_TITLE_TEST_ID } from './test_ids';

export interface AddRuleExceptionProps {
  /**
   * Alert document used to prefill exception fields and derive rule metadata.
   */
  hit: DataTableRecord;
  /**
   * Selected exception list type. `null` creates the default rule exception.
   */
  exceptionListType: ExceptionListTypeEnum | null;
  /**
   * Callback invoked when the user cancels the form. Receives whether the rule changed.
   */
  onCancel: (didRuleChange: boolean) => void;
  /**
   * Callback invoked after saving. Receives flags for rule changes and alert-closing choices.
   */
  onConfirm: (didRuleChange: boolean, didCloseAlert: boolean, didBulkCloseAlert: boolean) => void;
}

/**
 * Renders the Add Rule / Endpoint exception form inside a Flyout v2 tools flyout.
 * Adapts a `DataTableRecord` alert into the legacy exception form contract.
 */
export const AddRuleException: React.FC<AddRuleExceptionProps> = memo(
  ({ hit, exceptionListType, onCancel, onConfirm }) => {
    const handleClose = useCallback(() => onCancel(false), [onCancel]);

    const ruleId = useMemo(() => {
      const value = getFieldValue(hit, ALERT_RULE_UUID);
      return (Array.isArray(value) ? value[0] : value) as string;
    }, [hit]);
    const { rule: maybeRule, loading: isRuleLoading } = useRuleWithFallback(ruleId);
    const rules = useMemo<Rule[] | null>(() => (maybeRule ? [maybeRule] : null), [maybeRule]);
    // Without a ruleId, keep loading instead of rendering with rules=null.
    const isLoading = !ruleId || isRuleLoading;

    const isEndpointItem = exceptionListType === ExceptionListTypeEnum.ENDPOINT;
    const title = isEndpointItem ? ADD_ENDPOINT_EXCEPTION : CREATE_RULE_EXCEPTION;
    const isEndpointExceptionsMovedUnderManagement = useIsExperimentalFeatureEnabled(
      'endpointExceptionsMovedUnderManagement'
    );
    const renderEndpointExceptionContent =
      isEndpointItem && isEndpointExceptionsMovedUnderManagement;

    const alertData = useMemo<AlertData>(() => {
      // hit.flattened is always populated (from _source or from the fields API when
      // Discover sets _source: false). Convert its flat dotted keys to a nested structure
      // so that lodash get() can traverse the field paths used by exception helpers.
      const source = Object.entries(hit.flattened).reduce<Record<string, unknown>>(
        (acc, [key, value]) => {
          set(acc, key, value);
          return acc;
        },
        {}
      );
      return { ...source, _id: hit.raw._id, _index: hit.raw._index } as AlertData;
    }, [hit]);

    const alertStatus = useMemo<Status | undefined>(() => {
      const raw = getFieldValue(hit, ALERT_WORKFLOW_STATUS);
      const value = Array.isArray(raw) ? raw[0] : raw;
      return value as Status | undefined;
    }, [hit]);

    return (
      <EuiFlyout session="never" size="l" onClose={handleClose} aria-label={title}>
        <EuiFlyoutHeader hasBorder>
          <ToolsFlyoutHeader
            hit={hit}
            title={title}
            titleDataTestSubj={ADD_RULE_EXCEPTION_TITLE_TEST_ID}
          />
        </EuiFlyoutHeader>
        {isLoading ? (
          <EuiFlyoutBody data-test-subj={ADD_RULE_EXCEPTION_LOADING_TEST_ID}>
            <EuiSkeletonText lines={4} />
          </EuiFlyoutBody>
        ) : renderEndpointExceptionContent ? (
          <EndpointExceptionsFlyout
            rules={rules}
            alertData={alertData}
            isAlertDataLoading={false}
            alertStatus={alertStatus}
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        ) : (
          <AddExceptionFlyout
            rules={rules}
            isEndpointItem={isEndpointItem}
            renderFlyoutShell={false}
            alertData={alertData}
            isAlertDataLoading={false}
            alertStatus={alertStatus}
            isBulkAction={false}
            showAlertCloseOptions
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        )}
      </EuiFlyout>
    );
  }
);

AddRuleException.displayName = 'AddRuleException';
