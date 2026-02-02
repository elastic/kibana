/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rgba } from 'polished';
import styled, { createGlobalStyle } from 'styled-components';
import { IS_TIMELINE_FIELD_DRAGGING_CLASS_NAME } from '@kbn/securitysolution-t-grid';

/**
 * TIMELINE BODY
 */
export const SELECTOR_TIMELINE_GLOBAL_CONTAINER = 'securitySolutionTimeline__container';
export const TimelineContainer = styled.div.attrs(({ className = '' }) => ({
  className: `${SELECTOR_TIMELINE_GLOBAL_CONTAINER} ${className}`,
}))`
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: scroll;
`;

/**
 * TIMELINE BODY
 */
export const SELECTOR_TIMELINE_BODY_CLASS_NAME = 'securitySolutionTimeline__body';

// SIDE EFFECT: the following creates a global class selector
export const TimelineBodyGlobalStyle = createGlobalStyle`
  body.${IS_TIMELINE_FIELD_DRAGGING_CLASS_NAME} .${SELECTOR_TIMELINE_BODY_CLASS_NAME} {
    overflow: hidden;
  }
`;

export const TimelineBody = styled.div.attrs(({ className = '' }) => ({
  className: `${SELECTOR_TIMELINE_BODY_CLASS_NAME} ${className}`,
}))`
  height: auto;
  overflow: auto;
  scrollbar-width: thin;
  flex: 1;
  display: block;

  &::-webkit-scrollbar {
    height: ${({ theme }) => theme.eui.euiScrollBar};
    width: ${({ theme }) => theme.eui.euiScrollBar};
  }

  &::-webkit-scrollbar-thumb {
    background-clip: content-box;
    background-color: ${({ theme }) => rgba(theme.eui.euiColorDarkShade, 0.5)};
    border: ${({ theme }) => theme.eui.euiScrollBarCorner} solid transparent;
  }

  &::-webkit-scrollbar-corner,
  &::-webkit-scrollbar-track {
    background-color: transparent;
  }
`;
TimelineBody.displayName = 'TimelineBody';

/**
 * EVENTS TABLE
 */

export const EVENTS_TABLE_CLASS_NAME = 'siemEventsTable';

export const EventsTh = styled.div.attrs<{ role: string }>(
  ({ className = '', role = 'columnheader' }) => ({
    className: `siemEventsTable__th ${className}`,
    role,
  })
)`
  align-items: center;
  display: flex;
  flex-shrink: 0;
  min-width: 0;

  .siemEventsTable__thGroupActions &:first-child:last-child {
    flex: 1;
  }

  .siemEventsTable__thGroupData &:hover {
    background-color: ${({ theme }) => theme.eui.euiTableHoverColor};
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

export const EventsTrSupplement = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__trSupplement ${className}` as string,
}))<{ className: string; $display?: 'block' | 'inline-block' }>`
  display: ${({ $display }) => $display ?? 'inline-block'};
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  line-height: ${({ theme }) => theme.eui.euiLineHeight};
  padding-left: ${({ theme }) => theme.eui.euiSizeM};

  .euiAccordion + div {
    background-color: ${({ theme }) => theme.eui.euiColorEmptyShade};
    padding: 0 ${({ theme }) => theme.eui.euiSizeS};
    border: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
    border-radius: ${({ theme }) => theme.eui.euiSizeXS};
  }
`;

export const EventsTdContent = styled.div.attrs(({ className }) => ({
  className: `siemEventsTable__tdContent ${className != null ? className : ''}`,
}))<{ textAlign?: string; width?: number }>`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  line-height: ${({ theme }) => theme.eui.euiLineHeight};
  min-width: 0;
  text-align: ${({ textAlign }) => textAlign};
  width: ${({ width }) =>
    width != null
      ? `${width}px`
      : '100%'}; /* Using width: 100% instead of flex: 1 and max-width: 100% for IE11 */

  button.euiButtonIcon {
    margin-left: ${({ theme }) => `-${theme.eui.euiSizeXS}`};
  }
`;

export const HideShowContainer = styled.div.attrs<{ $isVisible: boolean }>(
  ({ $isVisible = false }) => ({
    style: {
      display: $isVisible ? 'block' : 'none',
    },
  })
)<{ $isVisible: boolean }>``;
