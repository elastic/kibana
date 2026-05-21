/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, type ReactElement, type ReactNode, useCallback } from 'react';
import type { EuiFlexGroupProps } from '@elastic/eui';
import { EuiAccordion, EuiFlexGroup, EuiSpacer, EuiTitle, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/react';
import { useAccordionState } from '../hooks/use_accordion_state';

export const HEADER_TEST_ID = 'Header';
export const CONTENT_TEST_ID = 'Content';

/**
 * Chrome can fail to repaint content inside EuiAccordion's overflow:hidden childWrapper
 * after it transitions open (especially inside flyouts).
 */
const accordionCss = css`
  .euiAccordion__childWrapper {
    overflow: visible;
  }
`;

export interface ExpandableSectionProps {
  /**
   * React component to render in the expandable section of the accordion
   */
  children: React.ReactNode;
  /**
   * Boolean to allow the component to be expanded or collapsed on first render
   */
  expanded: boolean;
  /**
   * Prefix data-test-subj to use for the header and expandable section of the accordion
   */
  ['data-test-subj']?: string;
  /**
   * Gutter size between contents in expandable section
   */
  gutterSize?: EuiFlexGroupProps['gutterSize'];
  /**
   * Optional string, if provided it will be used as the key to store the expanded/collapsed state boolean in local storage
   */
  localStorageKey?: string;
  /**
   * Optional string, if provided it will be used as the key to store the expanded/collapsed state boolean by section local storage
   */
  sectionId?: string;
  /**
   * Title value to render in the header of the accordion
   */
  title: ReactElement | string;
  /**
   * Optional content rendered in the accordion header row
   */
  extraAction?: ReactNode;
}

/**
 * Component used to render multiple sections in the Overview tab.
 * The state (expanded vs collapsed) can be saved in local storage if the localStorageKey is provided.
 * This allows the state to be preserved when opening new flyouts or when refreshing the page.
 */
export const ExpandableSection = memo(
  ({
    children,
    'data-test-subj': dataTestSub,
    expanded,
    gutterSize = 'none',
    localStorageKey,
    sectionId,
    title,
    extraAction,
  }: ExpandableSectionProps) => {
    const accordionId = useGeneratedHtmlId({ prefix: 'accordion' });
    const { renderContent, state, toggle } = useAccordionState(expanded);

    const headerDataTestSub = dataTestSub + HEADER_TEST_ID;
    const contentDataTestSub = dataTestSub + CONTENT_TEST_ID;

    const header = (
      <EuiTitle size="xs" data-test-subj={headerDataTestSub}>
        <h4>{title}</h4>
      </EuiTitle>
    );

    const onToggle = useCallback(() => {
      toggle({ localStorageKey, title: sectionId });
    }, [toggle, localStorageKey, sectionId]);

    return (
      <EuiAccordion
        forceState={state}
        onToggle={onToggle}
        id={accordionId}
        buttonContent={header}
        css={accordionCss}
        extraAction={extraAction}
      >
        <EuiSpacer size="m" />
        <EuiFlexGroup
          gutterSize={gutterSize}
          direction="column"
          data-test-subj={contentDataTestSub}
        >
          {renderContent && children}
        </EuiFlexGroup>
      </EuiAccordion>
    );
  }
);

ExpandableSection.displayName = 'ExpandableSection';
