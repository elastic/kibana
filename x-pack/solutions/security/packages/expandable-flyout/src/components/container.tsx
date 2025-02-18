/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { Interpolation, Theme } from '@emotion/react';
import { EuiFlyoutProps, EuiFlyoutResizable } from '@elastic/eui';
import { EuiFlyoutResizableProps } from '@elastic/eui/src/components/flyout/flyout_resizable';
import { changeUserCollapsedWidthAction, changeUserExpandedWidthAction } from '../store/actions';
import {
  selectDefaultWidths,
  selectPushVsOverlay,
  selectUserFlyoutWidths,
  useDispatch,
  useSelector,
} from '../store/redux';
import { useSections } from '../hooks/use_sections';
import { useExpandableFlyoutState } from '../hooks/use_expandable_flyout_state';
import { useExpandableFlyoutApi } from '../hooks/use_expandable_flyout_api';
import type { FlyoutPanelProps, Panel } from '../types';
import { SettingsMenu } from './settings_menu';
import { PreviewSection } from './preview_section';
import { ResizableContainer } from './resizable_container';

const COLLAPSED_FLYOUT_MIN_WIDTH = 380;
const EXPANDED_FLYOUT_MIN_WIDTH = 740;

export interface ContainerProps extends Omit<EuiFlyoutResizableProps, 'onClose'> {
  /**
   * List of all registered panels available for render
   */
  registeredPanels: Panel[];
  /**
   * Allows for custom styles to be passed to the EuiFlyout component
   */
  customStyles?: Interpolation<Theme>;
  /**
   * Callback function to let application's code the flyout is closed
   */
  onClose?: EuiFlyoutProps['onClose'];
  /**
   * Set of properties that drive a settings menu
   */
  flyoutCustomProps?: {
    /**
     * Hide the gear icon and settings menu if true
     */
    hideSettings?: boolean;
    /**
     * Control if the option to render in overlay or push mode is enabled or not
     */
    pushVsOverlay?: {
      /**
       * Disables the option
       */
      disabled: boolean;
      /**
       * Tooltip to display
       */
      tooltip: string;
    };
    /**
     * Control if the option to resize the flyout is enabled or not
     */
    resize?: {
      /**
       * Disables the option
       */
      disabled: boolean;
      /**
       * Tooltip to display
       */
      tooltip: string;
    };
  };
  /**
   * Optional data test subject string
   */
  'data-test-subj'?: string;
}

/**
 * Expandable flyout UI React component.
 * Displays 3 sections (right, left, preview) depending on the panels in the context.
 *
 * The behavior expects that the left and preview sections should only be displayed is a right section
 * is already rendered.
 */
export const Container: React.FC<ContainerProps> = memo(
  ({ customStyles, registeredPanels, flyoutCustomProps, ...flyoutProps }) => {
    const dispatch = useDispatch();

    const { left, right, preview } = useExpandableFlyoutState();
    const { closeFlyout } = useExpandableFlyoutApi();

    // for flyout where the push vs overlay option is disable in the UI we fall back to overlay mode
    const type = useSelector(selectPushVsOverlay);
    const flyoutType = flyoutCustomProps?.pushVsOverlay?.disabled ? 'overlay' : type;

    const flyoutWidths = useSelector(selectUserFlyoutWidths);
    const defaultWidths = useSelector(selectDefaultWidths);

    // retrieves the sections to be displayed
    const {
      leftSection,
      rightSection,
      previewSection,
      mostRecentPreview,
      mostRecentPreviewBanner,
    } = useSections({
      registeredPanels,
    });

    // calculates what needs to be rendered
    const showLeft = useMemo(() => leftSection != null && left != null, [leftSection, left]);
    const showRight = useMemo(() => rightSection != null && right != null, [rightSection, right]);
    const showPreview = useMemo(
      () => previewSection != null && preview != null,
      [previewSection, preview]
    );

    const showCollapsed = useMemo(() => !showLeft && showRight, [showLeft, showRight]);
    const showExpanded = useMemo(() => showLeft && showRight, [showLeft, showRight]);

    const leftComponent = useMemo(
      () => (leftSection ? leftSection.component({ ...(left as FlyoutPanelProps) }) : null),
      [leftSection, left]
    );
    const rightComponent = useMemo(
      () => (rightSection ? rightSection.component({ ...(right as FlyoutPanelProps) }) : null),
      [rightSection, right]
    );

    const previewComponent = useMemo(
      () =>
        previewSection
          ? previewSection.component({
              ...(mostRecentPreview as FlyoutPanelProps),
            })
          : null,
      [previewSection, mostRecentPreview]
    );

    // we want to set a minimum flyout width different when in collapsed and expanded mode
    const minFlyoutWidth = useMemo(
      () => (showExpanded ? EXPANDED_FLYOUT_MIN_WIDTH : COLLAPSED_FLYOUT_MIN_WIDTH),
      [showExpanded]
    );

    const flyoutWidth = useMemo(() => {
      if (showCollapsed) {
        return flyoutWidths.collapsedWidth || defaultWidths[type].rightWidth;
      }
      if (showExpanded) {
        return (
          flyoutWidths.expandedWidth ||
          defaultWidths[type].rightWidth + defaultWidths[type].leftWidth
        );
      }
    }, [
      defaultWidths,
      flyoutWidths.collapsedWidth,
      flyoutWidths.expandedWidth,
      showCollapsed,
      showExpanded,
      type,
    ]);

    // callback function called when user changes the flyout's width
    const onResize = useCallback(
      (width: number) => {
        if (showExpanded) {
          dispatch(
            changeUserExpandedWidthAction({
              width,
              savedToLocalStorage: true,
            })
          );
        } else if (showCollapsed) {
          dispatch(
            changeUserCollapsedWidthAction({
              width,
              savedToLocalStorage: true,
            })
          );
        }
      },
      [dispatch, showCollapsed, showExpanded]
    );

    // don't need to render if the windowWidth is 0 or if nothing needs to be rendered
    if (!showExpanded && !showCollapsed && !showPreview) {
      return null;
    }

    return (
      // @ts-ignore // TODO figure out why it's throwing a 'Types of property ref are incompatible' error
      <EuiFlyoutResizable
        {...flyoutProps}
        data-panel-id={right?.id ?? ''}
        type={flyoutType}
        size={flyoutWidth}
        ownFocus={false}
        onClose={(e) => {
          closeFlyout();
          if (flyoutProps.onClose) {
            flyoutProps.onClose(e);
          }
        }}
        css={customStyles}
        onResize={onResize}
        minWidth={minFlyoutWidth}
      >
        <ResizableContainer
          leftComponent={leftComponent as React.ReactElement}
          rightComponent={rightComponent as React.ReactElement}
          showLeft={showExpanded}
          showPreview={showPreview}
        />

        {showPreview && (
          <PreviewSection
            component={previewComponent as React.ReactElement}
            banner={mostRecentPreviewBanner}
            showExpanded={showExpanded}
          />
        )}

        {!flyoutCustomProps?.hideSettings && <SettingsMenu flyoutCustomProps={flyoutCustomProps} />}
      </EuiFlyoutResizable>
    );
  }
);

Container.displayName = 'Container';
