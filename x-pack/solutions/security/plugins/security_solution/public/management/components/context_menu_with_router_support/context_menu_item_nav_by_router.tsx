/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import type { EuiContextMenuItemProps } from '@elastic/eui';
import type { MouseEventHandler, Attributes } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { css } from '@emotion/react';
import type { NavigateToAppOptions } from '@kbn/core/public';
import { useNavigateToAppEventHandler } from '../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';

export interface ContextMenuItemNavByRouterProps extends EuiContextMenuItemProps {
  /** The Kibana (plugin) app id */
  navigateAppId?: string;
  /** Additional options for the navigation action via react-router */
  navigateOptions?: NavigateToAppOptions;
  /**
   * if `true`, the `children` will be wrapped in a truncate wrapper.
   * **NOTE**: When this component is used in combination with `ContextMenuWithRouterSupport` and `maxWidth`
   * is set on the menu component, this prop will be overridden
   */
  textTruncate?: boolean;
  /** Disables navigation */
  isNavigationDisabled?: boolean;
  children: React.ReactNode;
  key?: Attributes['key'];
}

/**
 * Keep truncated labels on one line with EUI's auto-injected external-link icon.
 * `EuiContextMenuItem` appends that icon as a sibling of `children` inside
 * `.euiContextMenuItem__text`, which otherwise wraps because the truncate wrapper is block-level.
 */
const truncatedItemCss = css`
  .euiContextMenuItem__text {
    display: flex;
    align-items: center;
    min-width: 0;

    > * + * {
      margin-block-start: 0;
    }
  }
`;

const truncatedLabelCss = css`
  flex: 1;
  min-width: 0;
`;

/**
 * Just like `EuiContextMenuItem`, but allows for additional props to be defined which will
 * allow navigation to a URL path via React Router
 */
export const ContextMenuItemNavByRouter = memo<ContextMenuItemNavByRouterProps>(
  ({
    navigateAppId,
    navigateOptions,
    onClick,
    textTruncate,
    children,
    href,
    isNavigationDisabled = false,
    css: cssProp,
    ...otherMenuItemProps
  }) => {
    const handleOnClickViaNavigateToApp = useNavigateToAppEventHandler(navigateAppId ?? '', {
      ...navigateOptions,
      onClick,
    });
    const getTestId = useTestIdGenerator(otherMenuItemProps['data-test-subj']);

    const handleItemClick = useCallback<MouseEventHandler>(
      (ev) => {
        if (isNavigationDisabled) {
          return;
        }

        if (navigateAppId) {
          handleOnClickViaNavigateToApp(ev);
        } else if (onClick) {
          onClick(ev);
        }
      },
      [handleOnClickViaNavigateToApp, isNavigationDisabled, navigateAppId, onClick]
    );

    return (
      <EuiContextMenuItem
        {...otherMenuItemProps}
        css={[cssProp, textTruncate ? truncatedItemCss : undefined]}
        onClick={handleItemClick}
        href={isNavigationDisabled ? undefined : href}
      >
        {textTruncate ? (
          <span
            css={truncatedLabelCss}
            className="eui-textTruncate"
            data-test-subj={getTestId('truncateWrapper')}
            {
              /* Add the html `title` prop if children is a string */
              ...('string' === typeof children ? { title: children } : {})
            }
          >
            {children}
          </span>
        ) : (
          children
        )}
      </EuiContextMenuItem>
    );
  }
);

ContextMenuItemNavByRouter.displayName = 'EuiContextMenuItemNavByRouter';
