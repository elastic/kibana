/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from '@emotion/styled';
import { css, Global } from '@emotion/react';
import { euiScrollBarStyles, useEuiTheme } from '@elastic/eui';
import { IS_TIMELINE_FIELD_DRAGGING_CLASS_NAME } from '@kbn/securitysolution-t-grid';

/**
 * TIMELINE BODY
 */
export const SELECTOR_TIMELINE_GLOBAL_CONTAINER = 'securitySolutionTimeline__container';
const TimelineContainerRoot = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: scroll;
`;

export const TimelineContainer: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  ...props
}) => (
  <TimelineContainerRoot
    className={`${SELECTOR_TIMELINE_GLOBAL_CONTAINER} ${className}`.trim()}
    {...props}
  />
);

/**
 * TIMELINE BODY
 */
export const SELECTOR_TIMELINE_BODY_CLASS_NAME = 'securitySolutionTimeline__body';

// SIDE EFFECT: the following creates a global class selector
export const TimelineBodyGlobalStyle = () => (
  <Global
    styles={css`
      body.${IS_TIMELINE_FIELD_DRAGGING_CLASS_NAME} .${SELECTOR_TIMELINE_BODY_CLASS_NAME} {
        overflow: hidden;
      }
    `}
  />
);

const TimelineBodyRoot = styled.div`
  height: auto;
  overflow: auto;
  flex: 1;
  display: block;
`;

export const TimelineBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  ...props
}) => {
  const euiThemeContext = useEuiTheme();

  return (
    <TimelineBodyRoot
      className={`${SELECTOR_TIMELINE_BODY_CLASS_NAME} ${className}`.trim()}
      css={css`
        ${euiScrollBarStyles(euiThemeContext)}
      `}
      {...props}
    />
  );
};

TimelineBody.displayName = 'TimelineBody';

/**
 * EVENTS TABLE
 */

export const EVENTS_TABLE_CLASS_NAME = 'siemEventsTable';

const EventsThRoot = styled.div`
  align-items: center;
  display: flex;
  flex-shrink: 0;
  min-width: 0;

  .siemEventsTable__thGroupActions &:first-child:last-child {
    flex: 1;
  }

  .siemEventsTable__thGroupData &:hover {
    background-color: ${({ theme }) => theme.euiTheme.colors.lightestShade};
    cursor: move; /* Fallback for IE11 */
    cursor: grab;
  }

  > div:focus {
    outline: 0; /* disable focus on Resizable element */
  }

  /* don't display Draggable placeholder */

  [data-rbd-placeholder-context-id] {
    display: none !important;
  }
`;

export const EventsTh: React.FC<React.HTMLAttributes<HTMLDivElement> & { role?: string }> = ({
  className = '',
  role = 'columnheader',
  ...props
}) => <EventsThRoot className={`siemEventsTable__th ${className}`.trim()} role={role} {...props} />;

const EventsTrSupplementRoot = styled('div', {
  shouldForwardProp: (prop) => prop !== '$display',
})<{ className?: string; $display?: 'block' | 'inline-block' }>`
  display: ${({ $display }) => $display ?? 'inline-block'};
  font-size: ${({ theme }) => theme.euiTheme.font.scale.xs};
  line-height: ${({ theme }) => theme.euiTheme.font.lineHeightMultiplier};
  padding-left: ${({ theme }) => theme.euiTheme.size.m};

  .euiAccordion + div {
    background-color: ${({ theme }) => theme.euiTheme.colors.emptyShade};
    padding: 0 ${({ theme }) => theme.euiTheme.size.s};
    border: 1px solid ${({ theme }) => theme.euiTheme.colors.lightShade};
    border-radius: ${({ theme }) => theme.euiTheme.size.xs};
  }
`;

export const EventsTrSupplement: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { $display?: 'block' | 'inline-block' }
> = ({ className = '', ...props }) => (
  <EventsTrSupplementRoot
    className={`siemEventsTable__trSupplement ${className}`.trim()}
    {...props}
  />
);

const EventsTdContentRoot = styled('div', {
  shouldForwardProp: (prop) => prop !== 'textAlign' && prop !== 'width',
})<{ textAlign?: string; width?: number }>`
  font-size: ${({ theme }) => theme.euiTheme.font.scale.xs};
  line-height: ${({ theme }) => theme.euiTheme.font.lineHeightMultiplier};
  min-width: 0;
  text-align: ${({ textAlign }) => textAlign};
  width: ${({ width }) =>
    width != null
      ? `${width}px`
      : '100%'}; /* Using width: 100% instead of flex: 1 and max-width: 100% for IE11 */

  button.euiButtonIcon {
    margin-left: ${({ theme }) => `-${theme.euiTheme.size.xs}`};
  }
`;

export const EventsTdContent: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { textAlign?: string; width?: number }
> = ({ className = '', ...props }) => (
  <EventsTdContentRoot className={`siemEventsTable__tdContent ${className}`.trim()} {...props} />
);

export const HideShowContainer: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { $isVisible?: boolean }
> = ({ $isVisible = false, style, ...props }) => (
  <div style={{ ...style, display: $isVisible ? 'block' : 'none' }} {...props} />
);
