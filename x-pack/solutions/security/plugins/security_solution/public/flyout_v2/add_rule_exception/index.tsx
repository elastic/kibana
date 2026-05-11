/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiFlyoutHeader, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { ToolsFlyoutHeader } from '../shared/components/tools_flyout_header';
import { AddRuleExceptionView } from './components/add_rule_exception_view';

const ADD_RULE_EXCEPTION_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.addRuleException.ruleTitle',
  { defaultMessage: 'Add rule exception' }
);

const ADD_ENDPOINT_EXCEPTION_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.addRuleException.endpointTitle',
  { defaultMessage: 'Add endpoint exception' }
);

export interface AddRuleExceptionProps {
  /**
   * Alert document the exception will be created from.
   */
  hit: DataTableRecord;
  /**
   * Selected exception type from the take action menu. `null` is treated as a default rule
   * exception.
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
 * Flyout v2 shell for the Add Rule / Endpoint exception form. Renders the v2 tools header
 * and delegates the form body and footer to {@link AddRuleExceptionView}.
 */
export const AddRuleException: React.FC<AddRuleExceptionProps> = memo(
  ({ hit, exceptionListType, onCancel, onConfirm }) => {
    const { euiTheme } = useEuiTheme();
    const title =
      exceptionListType === ExceptionListTypeEnum.ENDPOINT
        ? ADD_ENDPOINT_EXCEPTION_TITLE
        : ADD_RULE_EXCEPTION_TITLE;

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
        <AddRuleExceptionView
          hit={hit}
          exceptionListType={exceptionListType}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </>
    );
  }
);

AddRuleException.displayName = 'AddRuleException';
