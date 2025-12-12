/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutProps } from '@elastic/eui';
import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiContextMenu,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/css';
import React, { memo, useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { changePushVsOverlayAction } from '../store/actions';
import { selectPushVsOverlay, useDispatch, useSelector } from '../store/redux';

const SETTINGS_MENU_ICON_BUTTON = i18n.translate(
  'securitySolutionPackages.expandableFlyout.settingsMenu.popoverButton',
  {
    defaultMessage: 'Open flyout settings menu',
  }
);
const SETTINGS_MENU_TITLE = i18n.translate(
  'securitySolutionPackages.expandableFlyout.settingsMenu.popoverTitle',
  {
    defaultMessage: 'Flyout settings',
  }
);
const FLYOUT_TYPE_TITLE = i18n.translate(
  'securitySolutionPackages.expandableFlyout.settingsMenu.flyoutTypeTitle',
  {
    defaultMessage: 'Flyout type',
  }
);
const FLYOUT_TYPE_OVERLAY_MODE = i18n.translate(
  'securitySolutionPackages.expandableFlyout.settingsMenu.overlayMode',
  {
    defaultMessage: 'Overlay',
  }
);
const FLYOUT_TYPE_PUSH_MODE = i18n.translate(
  'securitySolutionPackages.expandableFlyout.settingsMenu.pushMode',
  {
    defaultMessage: 'Push',
  }
);

const OPTIONS = [
  {
    id: 'overlay',
    label: FLYOUT_TYPE_OVERLAY_MODE,
  },
  {
    id: 'push',
    label: FLYOUT_TYPE_PUSH_MODE,
  },
];

/**
 * Renders a menu to allow the user to customize the flyout.
 * Current customization are:
 * - enable/disable push vs overlay
 */
export const SettingsMenu = memo(() => {
  const dispatch = useDispatch();

  // for flyout where the push vs overlay option is disable in the UI we fall back to overlay mode
  const type = useSelector(selectPushVsOverlay);

  const [isPopoverOpen, setPopover] = useState(false);
  const togglePopover = () => {
    setPopover(!isPopoverOpen);
  };

  const pushVsOverlayOnChange = useCallback(
    (id: string) => {
      dispatch(
        changePushVsOverlayAction({
          type: id as EuiFlyoutProps['type'] as 'overlay' | 'push',
        })
      );
      setPopover(false);
    },
    [dispatch]
  );

  const panels = [
    {
      id: 0,
      title: SETTINGS_MENU_TITLE,
      content: (
        <EuiPanel paddingSize="s">
          <EuiTitle size="xxs">
            <h3>{FLYOUT_TYPE_TITLE}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiButtonGroup
            legend={FLYOUT_TYPE_TITLE}
            options={OPTIONS}
            idSelected={type}
            onChange={pushVsOverlayOnChange}
          />
          <EuiSpacer size="m" />
        </EuiPanel>
      ),
    },
  ];

  const button = (
    <EuiButtonIcon
      aria-label={SETTINGS_MENU_ICON_BUTTON}
      iconType="gear"
      color="text"
      onClick={togglePopover}
    />
  );

  return (
    <div
      className={css`
        position: absolute;
        inset-inline-end: 36px;
        inset-block-start: 8px;
      `}
    >
      <EuiPopover
        button={button}
        isOpen={isPopoverOpen}
        closePopover={togglePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
    </div>
  );
});

SettingsMenu.displayName = 'SettingsMenu';
