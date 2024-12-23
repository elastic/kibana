/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, type PropsWithChildren } from 'react';
import { EuiText, EuiTextTruncate, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { NODE_LABEL_WIDTH, NODE_WIDTH } from './styles';

const WORD_BOUNDARIES_REGEX = /\b/;
const FORCE_BREAK_REGEX = /(.{10})/;

/**
 * A component that renders an element with breaking opportunities (`<wbr>`s)
 * spliced into text children at word boundaries.
 * Copied from x-pack/plugins/security_solution/public/resolver/view/generated_text.tsx
 */
const GeneratedText = memo<PropsWithChildren<{}>>(function ({ children }) {
  return <>{processedValue()}</>;

  function processedValue() {
    return React.Children.map(children, (child) => {
      if (typeof child === 'string') {
        let valueSplitByWordBoundaries = child.split(WORD_BOUNDARIES_REGEX);

        if (valueSplitByWordBoundaries.length < 2) {
          valueSplitByWordBoundaries = child.split(FORCE_BREAK_REGEX);

          if (valueSplitByWordBoundaries.length < 2) {
            return valueSplitByWordBoundaries[0];
          }
        }

        return [
          valueSplitByWordBoundaries[0],
          ...valueSplitByWordBoundaries
            .splice(1)
            .reduce((generatedTextMemo: Array<string | JSX.Element>, value) => {
              if (
                generatedTextMemo.length > 0 &&
                typeof generatedTextMemo[generatedTextMemo.length - 1] === 'object'
              ) {
                return [...generatedTextMemo, value];
              }
              return [...generatedTextMemo, value, <wbr />];
            }, []),
        ];
      } else {
        return child;
      }
    });
  }
});

GeneratedText.displayName = 'GeneratedText';

export interface LabelProps {
  text?: string;
}

const LabelComponent = ({ text = '' }: LabelProps) => {
  const [isTruncated, setIsTruncated] = React.useState(false);

  return (
    <EuiText
      size="xs"
      textAlign="center"
      css={css`
        width: ${NODE_LABEL_WIDTH}px;
        margin-left: ${-(NODE_LABEL_WIDTH - NODE_WIDTH) / 2}px;
        overflow: hidden;
        text-overflow: ellipsis;
        max-height: 32px;
      `}
    >
      <EuiToolTip content={isTruncated ? text : ''} position="bottom">
        <EuiTextTruncate
          truncation="end"
          truncationOffset={20}
          text={text}
          width={NODE_LABEL_WIDTH * 1.5}
        >
          {(truncatedText) => (
            <>
              {setIsTruncated(truncatedText.length !== text.length)}
              {<GeneratedText>{truncatedText}</GeneratedText>}
            </>
          )}
        </EuiTextTruncate>
      </EuiToolTip>
    </EuiText>
  );
};

export const Label = styled(LabelComponent)`
  width: ${NODE_LABEL_WIDTH}px;
  margin-left: ${-(NODE_LABEL_WIDTH - NODE_WIDTH) / 2}px;
  text-overflow: ellipsis;
  overflow: hidden;
`;
