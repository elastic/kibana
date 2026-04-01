/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { EuiSpacer } from '@elastic/eui';
import type { EuiSpacerProps } from '@elastic/eui';
import React from 'react';

/**
 * A spacer component that prevents CSS margin collapse.
 *
 * ## Problem: CSS Margin Collapse
 *
 * When two adjacent elements have vertical margins, the browser collapses them
 * into a single margin (the larger of the two). This is standard CSS behavior,
 * but it can cause `EuiSpacer` components to appear ineffective when placed
 * between components that have their own margins (like `EuiFormRow`).
 *
 * ## Solution
 *
 * This component wraps `EuiSpacer` in a container with `display: flow-root`,
 * which creates a new block formatting context (BFC). A BFC prevents margin
 * collapse with elements outside of it, ensuring the spacer maintains its
 * full height.
 *
 * ## When to Use
 *
 * Use this component instead of `EuiSpacer` when:
 * - Spacers appear to have no effect between form elements
 * - You need guaranteed spacing between sections
 * - Adjacent components have margins that might collapse
 *
 * ## Example
 *
 * ```tsx
 * // Instead of:
 * <div>
 *   <EuiSpacer size="l" />
 * </div>
 *
 * // Use:
 * <SpacerWithoutMarginCollapse size="l" />
 * ```
 *
 * ## Technical Details
 *
 * The `display: flow-root` CSS property:
 * - Creates a new block formatting context
 * - Prevents margin collapse with outside elements
 * - Has no other side effects on layout
 * - Is supported in all modern browsers
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_display/Block_formatting_context
 */

interface SpacerWithoutMarginCollapseProps {
  /** Size of the spacer (xs, s, m, l, xl, xxl) */
  size: EuiSpacerProps['size'];
  /** Optional data-test-subj for testing */
  'data-test-subj'?: string;
}

const containerStyle = css`
  /*
   * display: flow-root creates a new block formatting context (BFC).
   * This prevents margin collapse with elements outside this container,
   * ensuring the spacer maintains its full height.
   */
  display: flow-root;
`;

const SpacerWithoutMarginCollapseComponent: React.FC<SpacerWithoutMarginCollapseProps> = ({
  'data-test-subj': dataTestSubj,
  size,
}) => {
  return (
    <div css={containerStyle} data-test-subj={dataTestSubj}>
      <EuiSpacer size={size} />
    </div>
  );
};

SpacerWithoutMarginCollapseComponent.displayName = 'SpacerWithoutMarginCollapse';

export const SpacerWithoutMarginCollapse = React.memo(SpacerWithoutMarginCollapseComponent);
