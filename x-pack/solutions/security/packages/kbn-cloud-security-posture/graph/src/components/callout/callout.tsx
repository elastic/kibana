/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiCallOut, EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import { GRAPH_CALLOUT_TEST_ID, GRAPH_CALLOUT_LINK_TEST_ID } from '../test_ids';

export interface CalloutProps {
  /**
   * The title of the callout
   */
  title: string;
  /**
   * The message content of the callout
   */
  message: string;
  /**
   * Links to display in the callout
   */
  links: Array<{ text: string; href: string }>;
  /**
   * Optional callback when the dismiss button is clicked
   */
  onDismiss?: () => void;
}

export const Callout = memo<CalloutProps>(({ title, message, links, onDismiss }) => {
  const { euiTheme } = useEuiTheme();

  const hasMultipleLinks = links.length > 1;

  return (
    <EuiCallOut
      title={title}
      color="primary"
      iconType="info"
      onDismiss={onDismiss}
      data-test-subj={GRAPH_CALLOUT_TEST_ID}
      size="s"
      css={css`
        width: 400px;
      `}
    >
      <EuiText
        size="xs"
        css={css`
          margin-bottom: ${hasMultipleLinks ? euiTheme.size.xs : '20px'};
        `}
      >
        {message}
      </EuiText>
      <div
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.xs};
        `}
      >
        {links.map((link, index) => (
          <EuiLink
            key={`${link.href}-${index}`}
            href={link.href}
            target="_blank"
            external
            data-test-subj={GRAPH_CALLOUT_LINK_TEST_ID}
          >
            {link.text}
          </EuiLink>
        ))}
      </div>
    </EuiCallOut>
  );
});

Callout.displayName = 'Callout';
