/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, type PropsWithChildren } from 'react';
import { EuiText, EuiTextTruncate, EuiToolTip, EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
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
  entityType?: 'user' | 'host' | 'other';
  entityCount?: number;
  secondaryLabel?: string;
  flagBadges?: Array<{ flag: string; count: number }>;
}

const LabelComponent = ({ text = '', entityType, entityCount, secondaryLabel, flagBadges = [] }: LabelProps) => {
  const [isTruncated, setIsTruncated] = React.useState(false);

  // Map entity types to display names
  const getEntityTypeDisplay = (type: string | undefined, count?: number) => {
    const baseDisplay = (() => {
      switch (type) {
        case 'user':
          return 'User';
        case 'host':
          return 'Host';
        case 'other':
          return 'Other Types';
        default:
          return '';
      }
    })();
    
    // Add count if provided and greater than 1
    if (count && count > 1) {
      return `${count} ${baseDisplay}`;
    }
    
    return baseDisplay;
  };

  // Process secondary label for IP addresses (hosts)
  const processSecondaryLabel = (label?: string, entityType?: string) => {
    if (!label) return label;
    
    // For hosts, check if the label contains IP addresses
    if (entityType === 'host' && label.includes('IP:')) {
      // Extract IP addresses from the label
      // Format: "IP: 10.200.0.202 +99" or similar
      const ipMatch = label.match(/IP:\s*([^+]*)\s*(\+\d+)?/);
      if (ipMatch) {
        const ipPart = ipMatch[1].trim();
        const countPart = ipMatch[2] || '';
        
        // For long IP lists, show only the first IP and then +count
        if (ipPart.includes(',') || ipPart.includes(' ')) {
          const firstIp = ipPart.split(/[,\s]+/)[0];
          return `IP: ${firstIp} ${countPart}`;
        }
        return `IP: ${ipPart} ${countPart}`;
      }
    }
    
    return label;
  };

  // Limit flag badges to maximum 2 with overflow indicator
  const processedFlagBadges = React.useMemo(() => {
    if (flagBadges.length <= 2) {
      return flagBadges;
    }
    
    // Show first 2 flags and combine the rest into a +X indicator
    const visibleBadges = flagBadges.slice(0, 2);
    const remainingCount = flagBadges.length - 2;
    const totalRemainingEvents = flagBadges.slice(2).reduce((sum, badge) => sum + badge.count, 0);
    
    return [
      ...visibleBadges,
      { flag: `+${remainingCount}`, count: totalRemainingEvents }
    ];
  }, [flagBadges]);

  return (
    <div
      css={css`
        width: ${NODE_LABEL_WIDTH}px;
        margin-left: ${-(NODE_LABEL_WIDTH - NODE_WIDTH) / 2}px;
        text-align: center;
        max-height: 80px;
        overflow: visible;
      `}
    >
      {/* Entity Type Tag with Count */}
      {entityType && (
        <EuiText size="xs" color="subdued" textAlign="center">
          <strong>{getEntityTypeDisplay(entityType, entityCount)}</strong>
        </EuiText>
      )}
      
      {/* Entity Name - Bold, 14px font size, single line with middle ellipsis */}
      <EuiText
        size="s"
        textAlign="center"
        css={css`
          font-weight: bold;
          font-size: 14px;
          margin-top: 2px;
          line-height: 1.2;
        `}
      >
        <EuiToolTip content={isTruncated ? text : ''} position="bottom">
          <EuiTextTruncate
            truncation="middle"
            text={text}
            width={NODE_LABEL_WIDTH}
          >
            {(truncatedText) => (
              <>
                {setIsTruncated(truncatedText.length !== text.length)}
                <GeneratedText>{truncatedText}</GeneratedText>
              </>
            )}
          </EuiTextTruncate>
        </EuiToolTip>
      </EuiText>

      {/* Secondary Label with IP processing */}
      {secondaryLabel && (
        <EuiText size="xs" color="subdued" textAlign="center">
          {processSecondaryLabel(secondaryLabel, entityType)}
        </EuiText>
      )}

      {/* Flag Badges with 2-badge limit */}
      {processedFlagBadges.length > 0 && (
        <div
          css={css`
            margin-top: 4px;
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 2px;
          `}
        >
          {processedFlagBadges.map((badge, index) => (
            <EuiBadge
              key={`${badge.flag}-${index}`}
              color="hollow"
              css={css`
                font-size: 10px;
                padding: 1px 4px;
                min-width: auto;
              `}
            >
              {badge.flag} +{badge.count}
            </EuiBadge>
          ))}
        </div>
      )}
    </div>
  );
};

export const Label = styled(LabelComponent)`
  /* All styling is handled within the component */
`;
