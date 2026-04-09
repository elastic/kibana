/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiPanel,
  EuiCopy,
  EuiButtonIcon,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { UnifiedExecutionResult } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { ExecutionStatusIndicator } from '../../../../../rule_monitoring';
import { FormattedDate } from '../../../../../../common/components/formatted_date';
import {
  RULE_EXECUTION_TYPE_BACKFILL,
  RULE_EXECUTION_TYPE_STANDARD,
} from '../../../../../../common/translations';
import * as i18n from '../translations';
import { UNIFIED_TO_RULE_STATUS } from '../columns';
import { shortenUuid } from '../utils';

interface FlyoutHeaderProps {
  item: UnifiedExecutionResult;
  titleId: string;
}

export const FlyoutHeader: React.FC<FlyoutHeaderProps> = ({ item, titleId }) => {
  const { euiTheme } = useEuiTheme();
  const separatorCss = css({ borderLeft: `${euiTheme.border.thin}` });

  return (
    <EuiFlyoutHeader hasBorder>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="m" id={titleId}>
            <h2>{i18n.FLYOUT_TITLE(shortenUuid(item.execution_uuid) ?? '—')}</h2>
          </EuiTitle>
        </EuiFlexItem>
        {item.execution_uuid !== null && (
          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={item.execution_uuid} beforeMessage={i18n.FLYOUT_COPY_EXECUTION_ID}>
              {(copy) => (
                <EuiButtonIcon
                  onClick={copy}
                  iconType="copy"
                  color="text"
                  aria-label={i18n.FLYOUT_COPY_EXECUTION_ID}
                />
              )}
            </EuiCopy>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiText color="subdued" size="s">
        <FormattedDate value={item.execution_start} fieldName="execution_start" />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder paddingSize="m">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{i18n.FLYOUT_HEADER_STATUS}</strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <span data-test-subj="executionDetailsFlyoutHeaderStatus">
              <ExecutionStatusIndicator
                status={UNIFIED_TO_RULE_STATUS[item.outcome.status]}
                showTooltip={false}
              />
            </span>
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={separatorCss} />
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{i18n.FLYOUT_HEADER_RUN_TYPE}</strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiText size="s" data-test-subj="executionDetailsFlyoutHeaderRunType">
              {item.backfill ? RULE_EXECUTION_TYPE_BACKFILL : RULE_EXECUTION_TYPE_STANDARD}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlyoutHeader>
  );
};
