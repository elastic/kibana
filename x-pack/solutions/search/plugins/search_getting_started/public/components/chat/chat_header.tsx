/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiPageTemplate, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DeploymentStatusBadges } from '../header/deployment_status_badges';

export const ChatHeader = () => {
  return (
    <EuiPageTemplate.Section data-test-subj="gettingStartedChatHeader" grow={false}>
      <EuiFlexGroup gutterSize="l" alignItems="flexStart" direction="column">
        <EuiFlexItem
          css={css({
            // ensures the trial badge and version badge fill parent with space between
            alignSelf: 'stretch',
          })}
        >
          <DeploymentStatusBadges />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem grow={4}>
              <EuiTitle size="l">
                <h1>
                  {i18n.translate('xpack.search.gettingStarted.chatPage.title', {
                    defaultMessage:
                      'Bring your data and start building your next search experience.',
                  })}
                </h1>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              <span />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageTemplate.Section>
  );
};
