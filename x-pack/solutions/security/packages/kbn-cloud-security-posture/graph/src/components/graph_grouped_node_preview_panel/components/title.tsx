/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiIcon } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ICON_TEST_ID, TOTAL_HITS_TEST_ID, GROUPED_ITEMS_TYPE_TEST_ID } from '../test_ids';
import { i18nNamespaceKey } from '../constants';

export interface TitleProps {
  icon: string;
  text: string;
  count?: number;
}

export const Title = ({ icon, text, count }: TitleProps) => {
  return (
    <EuiFlexGroup
      gutterSize="s"
      css={css`
        flex-grow: 0;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiIcon data-test-subj={ICON_TEST_ID} type={icon} size="l" color="text" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h2 data-test-subj={GROUPED_ITEMS_TYPE_TEST_ID}>
            {count ? (
              <>
                <span data-test-subj={TOTAL_HITS_TEST_ID}>
                  {i18n.translate(`${i18nNamespaceKey}.title`, {
                    defaultMessage: '{count} {text}',
                    values: { count, text },
                  })}
                </span>
              </>
            ) : (
              text
            )}
          </h2>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
