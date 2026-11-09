/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import type { WikiPageSummary } from './types';

interface WikiPageRowProps {
  page: WikiPageSummary;
  onSelectPage: (id: string) => void;
  showCorroborations?: boolean;
}

export function WikiPageRow({ page, onSelectPage, showCorroborations = true }: WikiPageRowProps) {
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      justifyContent="spaceBetween"
      responsive={false}
    >
      <EuiFlexItem
        className={css`
          min-width: 0;
        `}
      >
        <EuiLink
          className={css`
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
          onClick={() => onSelectPage(page.id)}
          data-test-subj={`nightshiftWikiHomePage-${page.id}`}
        >
          {page.title}
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText
          size="xs"
          color="subdued"
          className={css`
            white-space: nowrap;
          `}
        >
          {showCorroborations && page.corroborations > 0 && (
            <>
              <FormattedMessage
                id="xpack.nightshift.knowledge.wiki.corroborationCountLabel"
                defaultMessage="{count}x"
                values={{ count: page.corroborations }}
              />
              {' · '}
            </>
          )}
          <FormattedRelative value={page.updated_at} />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
