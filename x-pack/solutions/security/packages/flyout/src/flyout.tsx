/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import { useFlyoutApi } from './hooks/use_flyout_api';
import { useSections } from './hooks/use_sections';
import {
  selectChildSize,
  selectHasChildBackground,
  selectMainSize,
  selectPanels,
  selectPushVsOverlay,
  useSelector,
} from './store/redux';
import type { FlyoutPanelProps, Panel } from './types';
import { SettingsMenu } from './components/settings_menu';
import { MainSection } from './components/main';
import { ChildSection } from './components/child';

export interface FlyoutProps {
  /**
   *
   */
  overlays: OverlayStart;
  /**
   * List of all registered panels available for render
   */
  registeredPanels: Panel[];
}

export const Flyout: React.FC<FlyoutProps> = React.memo(({ overlays, registeredPanels }) => {
  const flyoutRef = useRef<OverlayRef | null>(null);
  const childFlyoutRef = useRef<OverlayRef | null>(null);

  const { main, child } = useSelector(selectPanels);

  const { closeFlyout, closeChildPanel } = useFlyoutApi();

  const type = useSelector(selectPushVsOverlay);

  const mainSize = useSelector(selectMainSize);
  const childSize = useSelector(selectChildSize);

  const hasChildBackground = useSelector(selectHasChildBackground);

  const { mainSection, childSection } = useSections({
    registeredPanels,
  });

  const showMain = useMemo(() => mainSection != null && main != null, [mainSection, main]);
  const showChild = useMemo(() => childSection != null && child != null, [childSection, child]);

  const mainComponent = useMemo(
    () => (mainSection ? mainSection.component({ ...(main as FlyoutPanelProps) }) : null),
    [mainSection, main]
  );
  const childComponent = useMemo(
    () => (childSection ? childSection.component({ ...(child as FlyoutPanelProps) }) : null),
    [childSection, child]
  );

  const mainFlyoutOnActive = useCallback(() => {
    console.log('activate main flyout with overlays', main?.id);
  }, [main?.id]);

  const childFlyoutOnActive = useCallback(() => {
    console.log('activate child flyout with overlays', child?.id);
  }, [child?.id]);

  const mainFlyoutOnClose = useCallback(() => {
    console.log('close main flyout with overlays', main?.id);

    if (childFlyoutRef.current) {
      childFlyoutRef.current.close();
      childFlyoutRef.current = null;
    }

    flyoutRef.current = null;
    closeFlyout();
  }, [closeFlyout, main?.id]);

  const childFlyoutOnClose = useCallback(() => {
    console.log('close child flyout with overlays', child?.id);

    if (childFlyoutRef.current) {
      childFlyoutRef.current.close();
      childFlyoutRef.current = null;
    }

    closeChildPanel();
  }, [child?.id, closeChildPanel]);

  const flyoutContent = useMemo(
    () => (
      <>
        <SettingsMenu />
        <MainSection component={mainComponent as React.ReactElement} />
      </>
    ),
    [mainComponent]
  );

  const childFlyoutContent = useMemo(
    () => <ChildSection component={childComponent as React.ReactElement} />,
    [childComponent]
  );

  useEffect(() => {
    if (showMain) {
      flyoutRef.current = overlays.openSystemFlyout(<>{flyoutContent}</>, {
        // title: `${main?.id} - Main`,
        maxWidth: true,
        // @ts-ignore
        resizable: true,
        type,
        session: 'start',
        ownFocus: false,
        size: mainSize,
        onActive: mainFlyoutOnActive,
        onClose: mainFlyoutOnClose,
      });
    }
  }, [
    flyoutContent,
    main?.id,
    mainFlyoutOnActive,
    mainFlyoutOnClose,
    mainSize,
    overlays,
    showMain,
    type,
  ]);

  useEffect(() => {
    if (showMain && showChild) {
      childFlyoutRef.current = overlays.openSystemFlyout(<>{childFlyoutContent}</>, {
        // title: `${child?.id} - Child`,
        session: 'inherit',
        hasChildBackground,
        // @ts-ignore
        resizable: true,
        maxWidth: true,
        ownFocus: false,
        size: childSize,
        onActive: childFlyoutOnActive,
        onClose: childFlyoutOnClose,
      });
    }
  }, [
    child?.id,
    childFlyoutContent,
    childSize,
    childFlyoutOnActive,
    childFlyoutOnClose,
    overlays,
    showChild,
    hasChildBackground,
    showMain,
  ]);

  return <></>;
});

Flyout.displayName = 'Flyout';
