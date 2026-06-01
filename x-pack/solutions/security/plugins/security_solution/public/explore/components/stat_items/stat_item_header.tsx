/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiTitle, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { FlexGroup, StyledTitle } from './utils';
import * as i18n from '../../../common/containers/query_toggle/translations';

const StatItemHeaderComponent = ({
  onToggle,
  isToggleExpanded,
  description,
}: {
  onToggle: () => void;
  isToggleExpanded: boolean;
  description?: string;
}) => (
  <FlexGroup gutterSize={'none'}>
    <EuiFlexItem className={isToggleExpanded ? '' : 'no-margin'}>
      <EuiFlexGroup gutterSize={'none'} responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={i18n.QUERY_BUTTON_TITLE(isToggleExpanded)} disableScreenReaderOutput>
            <EuiButtonIcon
              aria-label={i18n.QUERY_BUTTON_TITLE(isToggleExpanded)}
              data-test-subj="query-toggle-stat"
              color="text"
              display="empty"
              iconType={isToggleExpanded ? 'chevronSingleDown' : 'chevronSingleRight'}
              onClick={onToggle}
              size="xs"
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xxxs">
            <StyledTitle>{description}</StyledTitle>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  </FlexGroup>
);
export const StatItemHeader = React.memo(StatItemHeaderComponent);
StatItemHeader.displayName = 'StatItemHeader';
