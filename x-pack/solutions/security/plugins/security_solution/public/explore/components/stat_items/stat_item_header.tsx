/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiTitle } from '@elastic/eui';
import React from 'react';
import * as i18n from '../../../common/containers/query_toggle/translations';
import { useStyles } from './stat_item_header.styles';

const StatItemHeaderComponent = ({
  onToggle,
  isToggleExpanded,
  description,
}: {
  onToggle: () => void;
  isToggleExpanded: boolean;
  description?: string;
}) => {
  const styles = useStyles();

  return (
    <EuiFlexGroup css={styles.container} gutterSize={'none'}>
      <EuiFlexItem className={isToggleExpanded ? '' : 'no-margin'}>
        <EuiFlexGroup gutterSize={'none'} responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              aria-label={i18n.QUERY_BUTTON_TITLE(isToggleExpanded)}
              data-test-subj="query-toggle-stat"
              color="text"
              display="empty"
              iconType={isToggleExpanded ? 'arrowDown' : 'arrowRight'}
              onClick={onToggle}
              size="xs"
              title={i18n.QUERY_BUTTON_TITLE(isToggleExpanded)}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xxxs">
              <h6 css={styles.title}>{description}</h6>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
export const StatItemHeader = React.memo(StatItemHeaderComponent);
StatItemHeader.displayName = 'StatItemHeader';
