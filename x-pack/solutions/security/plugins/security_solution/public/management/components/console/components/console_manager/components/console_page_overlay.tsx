/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode, MouseEventHandler } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PageLayoutProps } from './page_layout';
import { PageLayout } from './page_layout';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { PageOverlay } from '../../../../page_overlay/page_overlay';
import { useUnmanagedFlyoutZIndex } from '../../../../../../common/hooks/use_unmanaged_flyout_z_index';

/**
 * Id used to register the console overlay with EUI's flyout manager. The console is a singleton, so
 * this only needs to be stable.
 */
const CONSOLE_OVERLAY_UNMANAGED_FLYOUT_ID = 'security-solution-console-overlay';

const BACK_LABEL = i18n.translate('xpack.securitySolution.consolePageOverlay.backButtonLabel', {
  defaultMessage: 'Back',
});

export interface ConsolePageOverlayProps {
  console: ReactNode;
  isHidden: boolean;
  onHide: () => void;
  pageTitle?: ReactNode;
  body?: ReactNode;
  actions?: ReactNode[];
  showCloseButton?: boolean;
}

export const ConsolePageOverlay = memo<ConsolePageOverlayProps>(
  ({ console, onHide, isHidden, body, actions, pageTitle = '', showCloseButton = false }) => {
    const getTestId = useTestIdGenerator('consolePageOverlay');

    // When the new flyout system is enabled, slot the overlay into EUI's shared flyout z-index
    // sequence so it renders above whatever flyout it was opened from, and below anything opened on
    // top of it (eg the response actions history flyout). Returns `undefined` for the legacy
    // expandable flyout, in which case `PageOverlay` falls back to its static z-index.
    const dynamicZIndex = useUnmanagedFlyoutZIndex({
      id: CONSOLE_OVERLAY_UNMANAGED_FLYOUT_ID,
      active: !isHidden,
    });

    const handleCloseOverlayOnClick: MouseEventHandler = useCallback(
      (ev) => {
        ev.preventDefault();
        onHide();
      },
      [onHide]
    );

    const layoutProps = useMemo<PageLayoutProps>(() => {
      // If in `hidden` mode, then we don't render the html for the layout header section
      // of the layout
      if (isHidden) return {};

      return {
        pageTitle,
        pageBody: body,
        headerHasBottomBorder: false,
        'data-test-subj': getTestId('layout'),
        headerBackComponent: (
          <EuiButtonEmpty
            flush="left"
            size="s"
            iconType="chevronSingleLeft"
            onClick={handleCloseOverlayOnClick}
            data-test-subj={getTestId('header-back-link')}
          >
            {BACK_LABEL}
          </EuiButtonEmpty>
        ),
        // hide the close button for now
        actions: showCloseButton
          ? [
              <EuiButton
                fill
                onClick={handleCloseOverlayOnClick}
                minWidth="auto"
                data-test-subj={getTestId('doneButton')}
              >
                <FormattedMessage
                  id="xpack.securitySolution.consolePageOverlay.doneButtonLabel"
                  defaultMessage="Done"
                />
              </EuiButton>,

              ...(actions ?? []),
            ]
          : [...(actions ?? [])],
      };
    }, [actions, body, getTestId, handleCloseOverlayOnClick, isHidden, pageTitle, showCloseButton]);

    return (
      <PageOverlay
        isHidden={isHidden}
        data-test-subj="consolePageOverlay"
        onHide={onHide}
        paddingSize="l"
        enableScrolling={false}
        zIndex={dynamicZIndex}
      >
        <PageLayout {...layoutProps}>{console}</PageLayout>
      </PageOverlay>
    );
  }
);
ConsolePageOverlay.displayName = 'ConsolePageOverlay';
