/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiFlexGroup,
  EuiTitle,
  EuiText,
  EuiToolTip,
  EuiFlexItem,
  EuiFlyoutHeader,
} from '@elastic/eui';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import type { SupportedHostOsType } from '../../../../../../../common/endpoint/constants';
import { FormattedDate } from '../../../../../../common/components/formatted_date';
import { SCRIPT_LIBRARY_LABELS as i18n } from '../../../translations';
import { ScriptTablePlatformBadges } from '../platform_badges';

interface EndpointScriptDetailsFlyoutHeaderProps {
  children?: React.ReactNode | React.ReactNode[];
  scriptName: string;
  lastUpdated: string;
  platforms: SupportedHostOsType[];
  'data-test-subj'?: string;
}

export const EndpointScriptDetailsFlyoutHeader = memo<EndpointScriptDetailsFlyoutHeaderProps>(
  ({ scriptName, lastUpdated, platforms, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    return (
      <EuiFlyoutHeader hasBorder data-test-subj={getTestId()}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem data-test-subj={getTestId('lastUpdatedLabel')}>
            <EuiFlexGroup
              justifyContent="flexStart"
              alignItems="center"
              gutterSize="xs"
              direction="row"
            >
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {i18n.table.columns.updatedAt}
                  {': '}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <FormattedDate
                  fieldName={i18n.table.columns.updatedAt}
                  value={lastUpdated}
                  className="eui-textTruncate"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem data-test-subj={getTestId('scriptNameTitle')}>
            <EuiToolTip content={scriptName} anchorClassName="eui-textTruncate">
              <EuiTitle size="s">
                <h2
                  className="eui-textTruncate"
                  data-test-subj={getTestId('scriptDetailsFlyoutTitle')}
                >
                  {scriptName}
                </h2>
              </EuiTitle>
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem data-test-subj={getTestId('platformBadges')}>
            <ScriptTablePlatformBadges
              platforms={platforms}
              data-test-subj={getTestId('platform')}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
    );
  }
);

EndpointScriptDetailsFlyoutHeader.displayName = 'EndpointScriptDetailsFlyoutHeader';
