/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const RecentActivity = () => {
  const { euiTheme } = useEuiTheme();
  const tabs = [
    {
      id: 'activity',
      name: i18n.translate('xpack.searchHomepage.recentActivity.tabs.activity', {
        defaultMessage: 'My activity',
      }),
      content: (
        <>
          <EuiSpacer />
          <EuiFlexGroup>
            <EuiFlexItem
              css={css({
                minHeight: euiTheme.base * 10,
              })}
            >
              <EuiPanel color="subdued">
                <EuiFlexGroup
                  direction="column"
                  alignItems="center"
                  justifyContent="center"
                  gutterSize="s"
                  css={css({
                    width: '100%',
                    height: '100%',
                  })}
                >
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="clock" size="l" color="primary" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" textAlign="center">
                      <p>
                        {i18n.translate(
                          'xpack.searchHomepage.recentActivity.p.yourRecentlyUpdatedItemsLabel',
                          { defaultMessage: 'Your recently updated items will appear here.' }
                        )}
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ),
    },
  ];

  return <EuiTabbedContent tabs={tabs} />;
};
