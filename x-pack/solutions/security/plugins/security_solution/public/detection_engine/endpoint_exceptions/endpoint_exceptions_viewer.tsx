/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { Rule } from '../rule_management/logic';
import { useGetEndpointExceptionsUnavailableComponent } from './use_get_endpoint_exceptions_unavailablle_component';
import { ExceptionsViewer } from '../rule_exceptions/components/all_exception_items_table';

const RULE_ENDPOINT_EXCEPTION_LIST_TYPE = [ExceptionListTypeEnum.ENDPOINT];

interface EndpointExceptionsViewerProps {
  isViewReadOnly: boolean;
  onRuleChange: () => void;
  rule: Rule | null;
  'data-test-subj': string;
}

export const EndpointExceptionsViewer = memo(
  ({
    isViewReadOnly,
    onRuleChange,
    rule,
    'data-test-subj': dataTestSubj,
  }: EndpointExceptionsViewerProps) => {
    const EndpointExceptionsUnavailableComponent = useGetEndpointExceptionsUnavailableComponent();
    return (
      <>
        {!EndpointExceptionsUnavailableComponent ? (
          <ExceptionsViewer
            rule={rule}
            listTypes={RULE_ENDPOINT_EXCEPTION_LIST_TYPE}
            onRuleChange={onRuleChange}
            isViewReadOnly={isViewReadOnly}
            data-test-subj={dataTestSubj}
          />
        ) : (
          <EuiFlexGroup justifyContent="spaceAround">
            <EuiFlexItem grow={false}>
              <EndpointExceptionsUnavailableComponent />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </>
    );
  }
);

EndpointExceptionsViewer.displayName = 'EndpointExceptionsViewer';
