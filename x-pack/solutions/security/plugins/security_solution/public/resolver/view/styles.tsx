/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiPanel } from '@elastic/eui';
import styled from 'styled-components';
import { NodeSubMenuComponents } from './submenu';

/**
 * See `NodeSubMenuComponents`
 */
export const NodeSubMenu = styled(NodeSubMenuComponents)`
  margin: 2px 0 0 0;
  padding: 0;
  border: none;
  display: flex;
  flex-flow: column;
  z-index: auto;

  &.options {
    font-size: 0.8rem;
    display: flex;
    flex-flow: row wrap;
    background: transparent;
    position: absolute;
    top: 4.5em;
    overflow-x: visible;
    width: 24ch;
    z-index: auto;
  }

  &.options::after {
    position: absolute;
    content: '';
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    z-index: 20;
    backdrop-filter: blur(2px);
    pointer-events: none;
  }

  &.options .item {
    margin: 0.25ch 0.35ch 0.35ch 0;
    padding: 0.35em 0.5em;
    height: fit-content;
    width: fit-content;
    border-radius: 2px;
    line-height: 0.8;
    z-index: 40;
  }

  &.options .item button {
    appearance: none;
    height: fit-content;
    width: fit-content;
    line-height: 0.8;
    outline-style: none;
    border-color: transparent;
    box-shadow: none;
  }

  &.options .item button:focus {
    outline-style: none;
    border-color: transparent;
    box-shadow: none;
    text-decoration: underline;
  }

  &.options .item button:active {
    transform: scale(0.95);
  }
`;

const EUI_HEADER_HEIGHT = '96px';
const EXPANDABLE_FLYOUT_LEFT_SECTION_HEADER_HEIGHT = '72px';
const VISUALIZE_WRAPPER_PADDING = '16px';
const VISUALIZE_BUTTON_GROUP_HEIGHT = '32px';
const EUI_SPACER_HEIGHT = '16px';

/**
 * The top level DOM element for Resolver
 * NB: `styled-components` may be used to wrap this.
 */
export const StyledMapContainer = styled.div<{ backgroundColor: string; windowHeight: number }>`
  /**
   * Take up all availble space
   */
  &,
  .resolver-graph {
    display: flex;
    flex-grow: 1;
  }
  .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-grow: 1;
  }
  /**
  * Set to force base-height necessary for resolver to show up in timeline.
  * Was previously set in events_viewer.tsx, but more appropriate here
   */
  min-height: calc(
    ${(props) => props.windowHeight}px - ${EUI_HEADER_HEIGHT} -
      ${EXPANDABLE_FLYOUT_LEFT_SECTION_HEADER_HEIGHT} - 2 * ${VISUALIZE_WRAPPER_PADDING} -
      ${VISUALIZE_BUTTON_GROUP_HEIGHT} - ${EUI_SPACER_HEIGHT}
  );
  /**
   * The placeholder components use absolute positioning.
   */
  position: relative;
  /**
   * Prevent partially visible components from showing up outside the bounds of Resolver.
   */
  overflow: hidden;
  contain: strict;
  background-color: ${(props) => props.backgroundColor};
`;

/**
 * The Panel, styled for use in `ResolverMap`.
 */
export const StyledPanel = styled(EuiPanel)`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  overflow: auto;
  width: 25em;
  max-width: 50%;
  border-radius: 0;
  border-top: none;
`;

/**
 * Used by ResolverMap to contain the lines and nodes.
 */
export const GraphContainer = styled.div`
  display: flex;
  flex-grow: 1;
  contain: layout;
  position: relative;
  z-index: 0;
`;

/**
 * See `RelatedEventLimitWarning`
 */
export const LimitWarningsEuiCallOut = styled(EuiCallOut)`
  flex-flow: row wrap;
  display: block;
  align-items: baseline;
  margin-top: 1em;

  & .euiCallOutHeader {
    display: inline;
    margin-right: 0.25em;
  }

  & .euiText {
    display: inline;
  }

  & .euiText p {
    display: inline;
  }
`;
