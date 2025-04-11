/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiListGroup,
  EuiFlexGroup,
  EuiFlexItem,
  useIsWithinBreakpoints,
  useEuiTheme,
  EuiListGroupItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiButtonIcon,
  EuiIcon,
} from '@elastic/eui';
import partition from 'lodash/fp/partition';
import classNames from 'classnames';
import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import type { SeparatorLinkCategory } from '@kbn/security-solution-navigation';
import { SolutionSideNavPanel } from './solution_side_nav_panel';
import { SolutionSideNavItemPosition } from './types';
import type { SolutionSideNavItem, Tracker } from './types';
import { TELEMETRY_EVENT } from './telemetry/const';
import { TelemetryContextProvider, useTelemetryContext } from './telemetry/telemetry_context';
import { SolutionSideNavItemStyles } from './solution_side_nav.styles';

export const TOGGLE_PANEL_LABEL = i18n.translate('securitySolutionPackages.sideNav.togglePanel', {
  defaultMessage: 'Toggle panel nav',
});

export interface SolutionSideNavProps {
  /** All the items to display in the side navigation */
  items: SolutionSideNavItem[];
  /** The id of the selected item to highlight. It only affects the top level items rendered in the main panel */
  selectedId: string;
  /** The categories to group and separate the main items. Ignores `position: 'bottom'` items */
  categories?: SeparatorLinkCategory[];
  /** Css value for the bottom offset of the secondary panel. defaults to 0 */
  panelBottomOffset?: string;
  /** Css value for the top offset of the secondary panel. defaults to the generic kibana header height */
  panelTopOffset?: string;
  /**
   * The tracker function to enable navigation Telemetry, this has to be bound with the plugin `appId`
   * e.g.: usageCollection?.reportUiCounter?.bind(null, appId)
   * */
  tracker?: Tracker;
}
type ActivePanelNav = string | null;
/**
 * The Solution side navigation main component
 */
export const SolutionSideNav: React.FC<SolutionSideNavProps> = React.memo(function SolutionSideNav({
  items,
  categories,
  selectedId,
  panelBottomOffset,
  panelTopOffset,
  tracker,
}) {
  const isMobileSize = useIsWithinBreakpoints(['xs', 's']);

  const [activePanelNavId, setActivePanelNavId] = useState<ActivePanelNav>(null);
  const activePanelNavIdRef = useRef<ActivePanelNav>(null);

  const openPanelNav = (id: string) => {
    activePanelNavIdRef.current = id;
    setActivePanelNavId(id);
  };

  const onClosePanelNav = useCallback(() => {
    activePanelNavIdRef.current = null;
    setActivePanelNavId(null);
  }, []);

  const onOutsidePanelClick = useCallback(() => {
    const currentPanelNavId = activePanelNavIdRef.current;
    setTimeout(() => {
      // This event is triggered on outside click.
      // Closing the side nav at the end of event loop to make sure it
      // closes also if the active panel button has been clicked (toggle),
      // but it does not close if any any other panel open button has been clicked.
      if (activePanelNavIdRef.current === currentPanelNavId) {
        onClosePanelNav();
      }
    });
  }, [onClosePanelNav]);

  const [topItems, bottomItems] = useMemo(
    () =>
      partition(
        ({ position = SolutionSideNavItemPosition.top }) =>
          position === SolutionSideNavItemPosition.top,
        items
      ),
    [items]
  );

  return (
    <TelemetryContextProvider tracker={tracker}>
      <EuiFlexGroup gutterSize="none" direction="column">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="none" direction="column">
            <EuiFlexItem grow={false}>
              <SolutionSideNavItems
                items={topItems}
                categories={categories}
                selectedId={selectedId}
                activePanelNavId={activePanelNavId}
                isMobileSize={isMobileSize}
                onOpenPanelNav={openPanelNav}
              />
            </EuiFlexItem>
            <EuiFlexItem />
            <EuiFlexItem grow={false}>
              <SolutionSideNavItems
                items={bottomItems}
                selectedId={selectedId}
                activePanelNavId={activePanelNavId}
                isMobileSize={isMobileSize}
                onOpenPanelNav={openPanelNav}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <SolutionSideNavPanels
        items={items}
        activePanelNavId={activePanelNavId}
        onClose={onClosePanelNav}
        onOutsideClick={onOutsidePanelClick}
        bottomOffset={panelBottomOffset}
        topOffset={panelTopOffset}
      />
    </TelemetryContextProvider>
  );
});

interface SolutionSideNavItemsProps {
  items: SolutionSideNavItem[];
  selectedId: string;
  activePanelNavId: ActivePanelNav;
  isMobileSize: boolean;
  onOpenPanelNav: (id: string) => void;
  categories?: SeparatorLinkCategory[];
}
/**
 * The Solution side navigation items component.
 * Renders either the top or bottom panel items, considering the categories if present.
 * When `categories` is received all links that do not belong to any category are ignored.
 */
const SolutionSideNavItems: React.FC<SolutionSideNavItemsProps> = React.memo(
  function SolutionSideNavItems({
    items,
    categories,
    selectedId,
    activePanelNavId,
    isMobileSize,
    onOpenPanelNav,
  }) {
    if (!categories?.length) {
      return (
        <>
          {items.map((item) => (
            <SolutionSideNavItem
              key={item.id}
              item={item}
              isSelected={selectedId === item.id}
              isActive={activePanelNavId === item.id}
              isMobileSize={isMobileSize}
              onOpenPanelNav={onOpenPanelNav}
            />
          ))}
        </>
      );
    }

    return (
      <>
        {categories?.map((category, categoryIndex) => {
          const categoryItems = category.linkIds.reduce<SolutionSideNavItem[]>((acc, linkId) => {
            const link = items.find((item) => item.id === linkId);
            if (link) {
              acc.push(link);
            }
            return acc;
          }, []);

          if (!categoryItems.length) {
            return null;
          }

          return (
            <React.Fragment key={categoryIndex}>
              {categoryIndex !== 0 && <EuiSpacer size="s" />}
              {categoryItems.map((item) => (
                <SolutionSideNavItem
                  key={item.id}
                  item={item}
                  isSelected={selectedId === item.id}
                  isActive={activePanelNavId === item.id}
                  isMobileSize={isMobileSize}
                  onOpenPanelNav={onOpenPanelNav}
                />
              ))}
              <EuiSpacer size="s" />
            </React.Fragment>
          );
        })}
      </>
    );
  }
);

interface SolutionSideNavItemProps {
  item: SolutionSideNavItem;
  isSelected: boolean;
  isActive: boolean;
  onOpenPanelNav: (id: string) => void;
  isMobileSize: boolean;
}
/**
 * The Solution side navigation item component.
 * Renders a single item for the main side navigation panel,
 * and it adds a button to open the item secondary panel if needed.
 */
const SolutionSideNavItem: React.FC<SolutionSideNavItemProps> = React.memo(
  function SolutionSideNavItem({ item, isSelected, isActive, isMobileSize, onOpenPanelNav }) {
    const { euiTheme } = useEuiTheme();
    const { tracker } = useTelemetryContext();

    const { id, href, label, items, onClick, iconType, appendSeparator } = item;

    const solutionSideNavItemStyles = SolutionSideNavItemStyles(euiTheme);
    const itemClassNames = classNames(
      'solutionSideNavItem',
      { 'solutionSideNavItem--isSelected': isSelected },
      solutionSideNavItemStyles
    );
    const buttonClassNames = classNames('solutionSideNavItemButton');

    const hasPanelNav = useMemo(
      () => !isMobileSize && items != null && items.length > 0,
      [items, isMobileSize]
    );

    const onLinkClicked: React.MouseEventHandler = useCallback(
      (ev) => {
        tracker?.(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.NAVIGATION}${id}`);
        onClick?.(ev);
      },
      [id, onClick, tracker]
    );

    const onButtonClick: React.MouseEventHandler = useCallback(() => {
      tracker?.(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.PANEL_NAVIGATION_TOGGLE}${id}`);
      onOpenPanelNav(id);
    }, [id, onOpenPanelNav, tracker]);

    const itemLabel = useMemo(() => {
      if (iconType == null) {
        return label;
      }
      return (
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem>{label}</EuiFlexItem>
          <EuiFlexItem grow={0} id={`solutionSideNavCustomIconItem-${id}`}>
            <EuiIcon type={iconType} color="text" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }, [iconType, label, id]);

    return (
      <>
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          <EuiFlexItem>
            <EuiListGroup gutterSize="none">
              <EuiListGroupItem
                label={itemLabel}
                href={href}
                wrapText
                onClick={onLinkClicked}
                className={itemClassNames}
                color="text"
                size="s"
                id={`solutionSideNavItemLink-${id}`}
                data-test-subj={`solutionSideNavItemLink-${id}`}
              />
            </EuiListGroup>
          </EuiFlexItem>
          {hasPanelNav && (
            <EuiFlexItem grow={0}>
              <EuiButtonIcon
                className={buttonClassNames}
                display={isActive ? 'base' : 'empty'}
                size="s"
                color="text"
                onClick={onButtonClick}
                iconType="spaces"
                iconSize="m"
                aria-label={TOGGLE_PANEL_LABEL}
                data-test-subj={`solutionSideNavItemButton-${id}`}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        {appendSeparator ? <EuiHorizontalRule margin="xs" /> : <EuiSpacer size="xs" />}
      </>
    );
  }
);

interface SolutionSideNavPanelsProps {
  items: SolutionSideNavItem[];
  activePanelNavId: ActivePanelNav;
  onClose: () => void;
  onOutsideClick: () => void;
  bottomOffset?: string;
  topOffset?: string;
}
/**
 * The Solution side navigation panels component.
 * Renders the secondary panel according to the `activePanelNavId` received.
 */
const SolutionSideNavPanels: React.FC<SolutionSideNavPanelsProps> = React.memo(
  function SolutionSideNavPanels({
    items,
    activePanelNavId,
    onClose,
    onOutsideClick,
    bottomOffset,
    topOffset,
  }) {
    const activePanelNavItem = useMemo<SolutionSideNavItem | undefined>(
      () => items.find(({ id }) => id === activePanelNavId),
      [items, activePanelNavId]
    );

    if (activePanelNavItem == null || !activePanelNavItem.items?.length) {
      return null;
    }

    return (
      <SolutionSideNavPanel
        onClose={onClose}
        onOutsideClick={onOutsideClick}
        items={activePanelNavItem.items}
        title={activePanelNavItem.label}
        categories={activePanelNavItem.categories}
        bottomOffset={bottomOffset}
        topOffset={topOffset}
      />
    );
  }
);

// eslint-disable-next-line import/no-default-export
export default SolutionSideNav;
