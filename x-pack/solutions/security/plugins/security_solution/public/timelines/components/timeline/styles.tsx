/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

/**
 * TIMELINE BODY
 */
export const SELECTOR_TIMELINE_GLOBAL_CONTAINER = 'securitySolutionTimeline__container';

type TimelineContainerProps = React.HTMLAttributes<HTMLDivElement>;

export const TimelineContainer = React.forwardRef<HTMLDivElement, TimelineContainerProps>(
  ({ className, ...rest }, ref) => (
    <div
      ref={ref}
      className={
        className
          ? `${SELECTOR_TIMELINE_GLOBAL_CONTAINER} ${className}`
          : SELECTOR_TIMELINE_GLOBAL_CONTAINER
      }
      css={css`
        height: 100%;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: scroll;
      `}
      {...rest}
    />
  )
);
TimelineContainer.displayName = 'TimelineContainer';

/**
 * EVENTS TABLE
 */

export const EVENTS_TABLE_CLASS_NAME = 'siemEventsTable';

interface EventsTrSupplementProps extends React.HTMLAttributes<HTMLDivElement> {
  $display?: 'block' | 'inline-block';
}

export const EventsTrSupplement: React.FC<EventsTrSupplementProps> = ({
  className,
  $display,
  ...rest
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      className={
        className ? `siemEventsTable__trSupplement ${className}` : 'siemEventsTable__trSupplement'
      }
      css={css`
        display: ${$display ?? 'inline-block'};
        font-size: ${euiTheme.font.scale.xs}rem;
        line-height: ${euiTheme.font.lineHeightMultiplier};
        padding-left: ${euiTheme.size.m};

        .euiAccordion + div {
          background-color: ${euiTheme.colors.emptyShade};
          padding: 0 ${euiTheme.size.s};
          border: 1px solid ${euiTheme.colors.lightShade};
          border-radius: ${euiTheme.size.xs};
        }
      `}
      {...rest}
    />
  );
};

interface EventsTdContentProps extends React.HTMLAttributes<HTMLDivElement> {
  textAlign?: string;
  width?: number;
}

export const EventsTdContent: React.FC<EventsTdContentProps> = ({
  className,
  textAlign,
  width,
  ...rest
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      className={
        className ? `siemEventsTable__tdContent ${className}` : 'siemEventsTable__tdContent'
      }
      css={css`
        font-size: ${euiTheme.font.scale.xs}rem;
        line-height: ${euiTheme.font.lineHeightMultiplier};
        min-width: 0;
        text-align: ${textAlign};
        width: ${width != null
          ? `${width}px`
          : '100%'}; /* Using width: 100% instead of flex: 1 and max-width: 100% for IE11 */

        button.euiButtonIcon {
          margin-left: -${euiTheme.size.xs};
        }
      `}
      {...rest}
    />
  );
};

interface HideShowContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  $isVisible: boolean;
}

export const HideShowContainer: React.FC<HideShowContainerProps> = ({
  $isVisible,
  style,
  ...rest
}) => <div style={{ display: $isVisible ? 'block' : 'none', ...style }} {...rest} />;
