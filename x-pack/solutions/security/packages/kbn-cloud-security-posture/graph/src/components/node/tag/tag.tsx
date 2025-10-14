/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme, useEuiFontSize } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { getAbbreviatedNumber } from '@kbn/cloud-security-posture-common';
import { GRAPH_TAG_WRAPPER_ID, GRAPH_TAG_COUNT_ID, GRAPH_TAG_TEXT_ID } from '../../test_ids';
import { TagCount, TagText } from './tag.styles';

const textFallback = i18n.translate('securitySolutionPackages.csp.graph.tag.textFallback', {
  defaultMessage: 'N/A',
});

export interface TagProps {
  count?: number;
  text?: string;
}

export const Tag = ({ count, text }: TagProps) => {
  const shouldShowBadge = !!count && count > 1;
  const { euiTheme } = useEuiTheme();
  const xxsFontSize = useEuiFontSize('xxs');
  return (
    <div
      css={css`
        display: flex;
        justify-content: center;
        ${xxsFontSize};
      `}
      data-test-subj={GRAPH_TAG_WRAPPER_ID}
    >
      {shouldShowBadge ? (
        <TagCount data-test-subj={GRAPH_TAG_COUNT_ID} color="primary">
          {getAbbreviatedNumber(count)}
        </TagCount>
      ) : null}
      <TagText
        data-test-subj={GRAPH_TAG_TEXT_ID}
        shouldShowBadge={shouldShowBadge}
        euiTheme={euiTheme}
        xxsFontSize={xxsFontSize}
      >
        {text ? text : textFallback}
      </TagText>
    </div>
  );
};
