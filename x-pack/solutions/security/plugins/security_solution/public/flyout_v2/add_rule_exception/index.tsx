/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiFlyoutBody, EuiFlyoutHeader, EuiSkeletonText, useEuiTheme } from '@elastic/eui';
import { ALERT_RULE_UUID, ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { Status } from '../../../common/api/detection_engine';
import { AddExceptionFlyoutContent } from '../../detection_engine/rule_exceptions/components/add_exception_flyout';
import {
  ADD_ENDPOINT_EXCEPTION,
  CREATE_RULE_EXCEPTION,
} from '../../detection_engine/rule_exceptions/components/flyout_components/header/translations';
import type { AlertData } from '../../detection_engine/rule_exceptions/utils/types';
import type { Rule } from '../../detection_engine/rule_management/logic/types';
import { useRuleWithFallback } from '../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { EndpointExceptionContent } from '../../management/pages/endpoint_exceptions/view/components/endpoint_exception_content';
import { ToolsFlyoutHeader } from '../shared/components/tools_flyout_header';
import { ADD_RULE_EXCEPTION_LOADING_TEST_ID } from './test_ids';

export interface AddRuleExceptionProps {
  hit: DataTableRecord;
  exceptionListType: ExceptionListTypeEnum | null;
  onCancel: (didRuleChange: boolean) => void;
  onConfirm: (didRuleChange: boolean, didCloseAlert: boolean, didBulkCloseAlert: boolean) => void;
}

export const AddRuleException: React.FC<AddRuleExceptionProps> = memo(
  ({ hit, exceptionListType, onCancel, onConfirm }) => {
    const { euiTheme } = useEuiTheme();

    const ruleId = (getFieldValue(hit, ALERT_RULE_UUID) as string) ?? '';
    const { rule: maybeRule, loading: isRuleLoading } = useRuleWithFallback(ruleId);
    const rules = useMemo<Rule[] | null>(() => (maybeRule ? [maybeRule] : null), [maybeRule]);

    const isEndpointItem = exceptionListType === ExceptionListTypeEnum.ENDPOINT;
    const title = isEndpointItem ? ADD_ENDPOINT_EXCEPTION : CREATE_RULE_EXCEPTION;
    const isEndpointExceptionsMovedUnderManagement = useIsExperimentalFeatureEnabled(
      'endpointExceptionsMovedUnderManagement'
    );
    const renderEndpointExceptionContent =
      isEndpointItem && isEndpointExceptionsMovedUnderManagement;

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

    return (
      <>
        <EuiFlyoutHeader
          hasBorder
          css={css`
            padding-block: ${euiTheme.size.s} !important;
          `}
        >
          <ToolsFlyoutHeader hit={hit} title={title} />
        </EuiFlyoutHeader>
        {isRuleLoading || alertData == null ? (
          <EuiFlyoutBody data-test-subj={ADD_RULE_EXCEPTION_LOADING_TEST_ID}>
            <EuiSkeletonText lines={4} />
          </EuiFlyoutBody>
        ) : renderEndpointExceptionContent ? (
          <EndpointExceptionContent
            rules={rules}
            alertData={alertData}
            isAlertDataLoading={false}
            alertStatus={alertStatus}
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        ) : (
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
        )}
      </>
    );
  }
);

AddRuleException.displayName = 'AddRuleException';
