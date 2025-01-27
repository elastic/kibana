/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFocusTrap,
  EuiHorizontalRule,
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiOutsideClickDetector,
  EuiPanel,
  EuiPortal,
  EuiSpacer,
  EuiTitle,
  EuiWindowEvent,
  keys,
  useEuiTheme,
  useIsWithinMinBreakpoint,
} from '@elastic/eui';
import classNames from 'classnames';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  isAccordionLinkCategory,
  isTitleLinkCategory,
  isSeparatorLinkCategory,
  type LinkCategories,
  type TitleLinkCategory,
  type AccordionLinkCategory,
  type SeparatorLinkCategory,
} from '@kbn/security-solution-navigation';
import type { SolutionSideNavItem } from './types';
import { TELEMETRY_EVENT } from './telemetry/const';
import { useTelemetryContext } from './telemetry/telemetry_context';
import {
  SolutionSideNavPanelStyles,
  SolutionSideNavCategoryTitleStyles,
  SolutionSideNavTitleStyles,
  SolutionSideNavCategoryAccordionStyles,
  SolutionSideNavPanelLinksGroupStyles,
  panelClassName,
  accordionButtonClassName,
  SolutionSideNavPanelItemStyles,
} from './solution_side_nav_panel.styles';

export interface SolutionSideNavPanelContentProps {
  title: string;
  onClose: () => void;
  items: SolutionSideNavItem[];
  categories?: LinkCategories;
}
export interface SolutionSideNavPanelProps extends SolutionSideNavPanelContentProps {
  onOutsideClick: () => void;
  bottomOffset?: string;
  topOffset?: string;
}
/**
 * Renders the secondary navigation panel for the nested link items
 */
export const SolutionSideNavPanel: React.FC<SolutionSideNavPanelProps> = React.memo(
  function SolutionSideNavPanel({
    onClose,
    onOutsideClick,
    title,
    categories,
    items,
    bottomOffset,
    topOffset,
  }) {
    const { euiTheme } = useEuiTheme();
    const isLargerBreakpoint = useIsWithinMinBreakpoint('l');

    // Only larger breakpoint needs to add bottom offset, other sizes should have full height
    const $bottomOffset = isLargerBreakpoint ? bottomOffset : undefined;
    const $topOffset = isLargerBreakpoint ? topOffset : undefined;
    const hasShadow = !$bottomOffset;

    const solutionSideNavPanelStyles = SolutionSideNavPanelStyles(euiTheme, {
      $bottomOffset,
      $topOffset,
    });
    const panelClasses = classNames(panelClassName, 'eui-yScroll', solutionSideNavPanelStyles);

    // ESC key closes PanelNav
    const onKeyDown = useCallback(
      (ev: KeyboardEvent) => {
        if (ev.key === keys.ESCAPE) {
          onClose();
        }
      },
      [onClose]
    );

    return (
      <>
        <EuiWindowEvent event="keydown" handler={onKeyDown} />
        <EuiPortal>
          <EuiFocusTrap autoFocus>
            <EuiOutsideClickDetector onOutsideClick={onOutsideClick}>
              <EuiPanel
                className={panelClasses}
                hasShadow={hasShadow}
                borderRadius="none"
                paddingSize="m"
                data-test-subj="solutionSideNavPanel"
              >
                <SolutionSideNavPanelContent
                  title={title}
                  categories={categories}
                  items={items}
                  onClose={onClose}
                />
              </EuiPanel>
            </EuiOutsideClickDetector>
          </EuiFocusTrap>
        </EuiPortal>
      </>
    );
  }
);

export const SolutionSideNavPanelContent: React.FC<SolutionSideNavPanelContentProps> = React.memo(
  function SolutionSideNavPanelContent({ title, onClose, categories, items }) {
    const { euiTheme } = useEuiTheme();
    const titleClasses = classNames(SolutionSideNavTitleStyles(euiTheme));
    return (
      <EuiFlexGroup direction="column" gutterSize="m" alignItems="flexStart">
        <EuiFlexItem>
          <EuiTitle size="xs" className={titleClasses}>
            <strong>{title}</strong>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem style={{ width: '100%' }}>
          {categories ? (
            <SolutionSideNavPanelCategories
              categories={categories}
              items={items}
              onClose={onClose}
            />
          ) : (
            <SolutionSideNavPanelItems items={items} onClose={onClose} />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

interface SolutionSideNavPanelCategoriesProps {
  categories: LinkCategories;
  items: SolutionSideNavItem[];
  onClose: () => void;
}
/**
 * Renders all the categories for the secondary navigation panel.
 * Links that do not belong to any category are ignored
 */
const SolutionSideNavPanelCategories: React.FC<SolutionSideNavPanelCategoriesProps> = React.memo(
  function SolutionSideNavPanelCategories({ categories, items, onClose }) {
    return (
      <>
        {categories.map((category, index) => {
          if (isTitleLinkCategory(category)) {
            return (
              <SolutionSideNavPanelTitleCategory
                key={`${category.label}-${index}`}
                category={category}
                items={items}
                onClose={onClose}
              />
            );
          }
          if (isAccordionLinkCategory(category)) {
            return (
              <SolutionSideNavPanelAccordionCategory
                key={`${category.label}-${index}`}
                category={category}
                items={items}
                onClose={onClose}
                index={index}
              />
            );
          }
          if (isSeparatorLinkCategory(category)) {
            return (
              <SolutionSideNavPanelSeparatorCategory
                category={category}
                items={items}
                onClose={onClose}
                key={index}
              />
            );
          }
          return null;
        })}
      </>
    );
  }
);

/** Helper to retrieve the items for a given category */
const useCategoryItems = ({
  items,
  linkIds,
}: {
  items: SolutionSideNavItem[];
  linkIds: readonly string[];
}) => {
  return useMemo(
    () =>
      linkIds.reduce<SolutionSideNavItem[]>((acc, linkId) => {
        const link = items.find((item) => item.id === linkId);
        if (link) {
          acc.push(link);
        }
        return acc;
      }, []),
    [items, linkIds]
  );
};

interface SolutionSideNavPanelTitleCategoryProps {
  items: SolutionSideNavItem[];
  category: TitleLinkCategory;
  onClose: () => void;
}
/**
 * Renders a title category for the secondary navigation panel.
 */
const SolutionSideNavPanelTitleCategory: React.FC<SolutionSideNavPanelTitleCategoryProps> =
  React.memo(function SolutionSideNavPanelTitleCategory({
    category: { linkIds, label },
    items,
    onClose,
  }) {
    const { euiTheme } = useEuiTheme();
    const titleClasses = classNames(SolutionSideNavCategoryTitleStyles(euiTheme));
    const categoryItems = useCategoryItems({ items, linkIds });
    if (!categoryItems?.length) {
      return null;
    }
    return (
      <>
        <EuiSpacer size="l" />
        <EuiTitle size="xxxs" className={titleClasses}>
          <h2>{label}</h2>
        </EuiTitle>
        <SolutionSideNavPanelItems items={categoryItems} onClose={onClose} />
      </>
    );
  });

interface SolutionSideNavPanelAccordionCategoryProps {
  category: AccordionLinkCategory;
  items: SolutionSideNavItem[];
  onClose: () => void;
  index: number;
}
/**
 * Renders an accordion category for the secondary navigation panel.
 */
const SolutionSideNavPanelAccordionCategory: React.FC<SolutionSideNavPanelAccordionCategoryProps> =
  React.memo(function SolutionSideNavPanelAccordionCategory({
    category: { label, categories },
    items,
    onClose,
    index,
  }) {
    const { euiTheme } = useEuiTheme();
    const accordionClasses = classNames(SolutionSideNavCategoryAccordionStyles(euiTheme));
    return (
      <>
        {index > 0 && <EuiHorizontalRule margin="xs" />}
        <EuiSpacer size="m" />
        <EuiAccordion
          id={label}
          buttonContent={label}
          className={accordionClasses}
          buttonClassName={accordionButtonClassName}
        >
          {categories && (
            <SolutionSideNavPanelCategories
              categories={categories}
              items={items}
              onClose={onClose}
            />
          )}
          {/* This component can be extended to render SolutionSideNavPanelItems when `linkIds` is defined in the category */}
        </EuiAccordion>
      </>
    );
  });

interface SolutionSideNavPanelSeparatorCategoryProps {
  category: SeparatorLinkCategory;
  items: SolutionSideNavItem[];
  onClose: () => void;
}
/**
 * Renders a separator category for the secondary navigation panel.
 */
const SolutionSideNavPanelSeparatorCategory: React.FC<SolutionSideNavPanelSeparatorCategoryProps> =
  React.memo(function SolutionSideNavPanelSeparatorCategory({
    category: { linkIds },
    items,
    onClose,
  }) {
    const categoryItems = useCategoryItems({ items, linkIds });
    if (!categoryItems?.length) {
      return null;
    }
    return (
      <>
        <EuiSpacer size="m" />
        <SolutionSideNavPanelItems items={categoryItems} onClose={onClose} />
      </>
    );
  });

interface SolutionSideNavPanelItemsProps {
  items: SolutionSideNavItem[];
  onClose: () => void;
}
/**
 * Renders the items for the secondary navigation panel.
 */
const SolutionSideNavPanelItems: React.FC<SolutionSideNavPanelItemsProps> = React.memo(
  function SolutionSideNavPanelItems({ items, onClose }) {
    const panelLinksGroupClassNames = classNames(SolutionSideNavPanelLinksGroupStyles());
    return (
      <EuiListGroup className={panelLinksGroupClassNames}>
        {items.map((item) => (
          <SolutionSideNavPanelItem key={item.id} item={item} onClose={onClose} />
        ))}
      </EuiListGroup>
    );
  }
);

interface SolutionSideNavPanelItemProps {
  item: SolutionSideNavItem;
  onClose: () => void;
}
/**
 * Renders one item for the secondary navigation panel.
 * */
const SolutionSideNavPanelItem: React.FC<SolutionSideNavPanelItemProps> = React.memo(
  function SolutionSideNavPanelItem({ item, onClose }) {
    const { tracker } = useTelemetryContext();
    const { euiTheme } = useEuiTheme();
    const panelLinkClassNames = classNames(SolutionSideNavPanelItemStyles(euiTheme));
    const { id, href, onClick, iconType, openInNewTab } = item;
    const onClickHandler = useCallback<React.MouseEventHandler>(
      (ev) => {
        tracker?.(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.PANEL_NAVIGATION}${id}`);
        onClose();
        onClick?.(ev);
      },
      [id, onClick, onClose, tracker]
    );

    return (
      <EuiListGroupItem
        key={id}
        label={<ItemLabel item={item} />}
        wrapText
        className={panelLinkClassNames}
        size="s"
        data-test-subj={`solutionSideNavPanelLink-${id}`}
        href={href}
        iconType={iconType}
        onClick={onClickHandler}
        target={openInNewTab ? '_blank' : undefined}
      />
    );
  }
);

/**
 * Renders the navigation item label
 **/
const ItemLabel: React.FC<{ item: SolutionSideNavItem }> = React.memo(function ItemLabel({
  item: { label, openInNewTab },
}) {
  return (
    <>
      {label} {openInNewTab && <EuiIcon type="popout" size="s" />}
    </>
  );
});
