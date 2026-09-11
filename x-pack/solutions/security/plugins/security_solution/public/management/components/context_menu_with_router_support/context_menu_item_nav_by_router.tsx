/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import type { EuiContextMenuItemProps } from '@elastic/eui';
import type { MouseEventHandler } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import type { NavigateToAppOptions } from '@kbn/core/public';
import { useNavigateToAppEventHandler } from '../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';

export interface ContextMenuItemNavByRouterProps extends EuiContextMenuItemProps {
  /** The Kibana (plugin) app id */
  navigateAppId?: string;
  /** Additional options for the navigation action via react-router */
  navigateOptions?: NavigateToAppOptions;
  /**
   * if `true`, the `children` will be wrapped in a `div` that contains CSS Classname `eui-textTruncate`.
   * **NOTE**: When this component is used in combination with `ContextMenuWithRouterSupport` and `maxWidth`
   * is set on the menu component, this prop will be overridden
   */
  textTruncate?: boolean;
  /** Disables navigation */
  isNavigationDisabled?: boolean;
  children: React.ReactNode;
}

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
        onClick={handleItemClick}
        href={isNavigationDisabled ? undefined : href}
      >
        {textTruncate ? (
          <div
            className="eui-textTruncate"
            data-test-subj={getTestId('truncateWrapper')}
            {
              /* Add the html `title` prop if children is a string */
              ...('string' === typeof children ? { title: children } : {})
            }
          >
            {children}
          </div>
        ) : (
          children
        )}
      </EuiContextMenuItem>
    );
  }
);

ContextMenuItemNavByRouter.displayName = 'EuiContextMenuItemNavByRouter';
