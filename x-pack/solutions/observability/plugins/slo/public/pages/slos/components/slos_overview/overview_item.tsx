/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiStat, EuiToolTip, euiFocusRing, keys, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { KeyboardEventHandler } from 'react';
import React, { useCallback } from 'react';
import { useUrlSearchState } from '../../hooks/use_url_search_state';

interface OverviewItemProps {
  title?: string | number;
  description: string;
  /**
   * Accessible name for the stat. Because the stat is exposed as a button, this replaces the
   * visible title/description text, so it must include the count as well as the action it performs.
   */
  ariaLabel: string;
  titleColor: string;
  isLoading: boolean;
  query?: string;
  tooltip?: string;
  onClick?: () => void;
}

export function OverviewItem({
  title,
  description,
  ariaLabel,
  titleColor,
  isLoading,
  query,
  tooltip,
  onClick,
}: OverviewItemProps) {
  const euiThemeContext = useEuiTheme();
  const { onStateChange } = useUrlSearchState();

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
      return;
    }

    onStateChange({ kqlQuery: query });
  }, [onClick, onStateChange, query]);

  const handleKeyDown = useCallback<KeyboardEventHandler>(
    (event) => {
      if (event.key !== keys.ENTER && event.key !== keys.SPACE) {
        return;
      }

      // Space would otherwise scroll the page
      event.preventDefault();
      handleClick();
    },
    [handleClick]
  );

  // `tabIndex` puts the stat in the tab order, which also lets `EuiToolTip` reveal the tooltip on
  // keyboard focus - it does so by cloning its child to attach `onFocus`/`onBlur`, which never
  // fire on a non-focusable element.
  const stat = (
    <EuiStat
      title={title}
      description={description}
      titleColor={titleColor}
      reverse={true}
      isLoading={isLoading}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      css={css`
        cursor: pointer;

        &:focus-visible {
          ${euiFocusRing(euiThemeContext)}
        }
      `}
    />
  );

  return (
    <EuiFlexItem grow={false}>
      {tooltip ? (
        // The tooltip is purely visual: `disableScreenReaderOutput` drops the `aria-describedby`
        // link so assistive technology doesn't read the action out twice, once from `aria-label`
        // and again from the tooltip. Anything the tooltip says that the label doesn't must
        // therefore be part of `ariaLabel`.
        <EuiToolTip content={tooltip} disableScreenReaderOutput>
          {stat}
        </EuiToolTip>
      ) : (
        stat
      )}
    </EuiFlexItem>
  );
}
