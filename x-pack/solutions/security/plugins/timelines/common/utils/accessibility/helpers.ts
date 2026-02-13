/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import {
  DRAGGABLE_KEYBOARD_WRAPPER_CLASS_NAME,
  HOVER_ACTIONS_ALWAYS_SHOW_CLASS_NAME,
  ROW_RENDERER_CLASS_NAME,
} from '@kbn/securitysolution-t-grid';

/**
 * The name of the ARIA attribute representing a column, used in conjunction with
 * the ARIA: grid role https://www.w3.org/TR/wai-aria-practices-1.1/examples/grid/dataGrids.html
 */
export const ARIA_COLINDEX_ATTRIBUTE = 'aria-colindex';

/**
 * This alternative attribute to `aria-colindex` is used to decorate the data
 * in existing `EuiTable`s to enable keyboard navigation with minimal
 * refactoring of existing code until we're ready to migrate to `EuiDataGrid`.
 * It may be applied directly to keyboard-focusable elements and thus doesn't
 * have exactly the same semantics as `aria-colindex`.
 */
export const DATA_COLINDEX_ATTRIBUTE = 'data-colindex';

/**
 * The name of the ARIA attribute representing a row, used in conjunction with
 * the ARIA: grid role https://www.w3.org/TR/wai-aria-practices-1.1/examples/grid/dataGrids.html
 */
export const ARIA_ROWINDEX_ATTRIBUTE = 'aria-rowindex';

/**
 * This alternative attribute to `aria-rowindex` is used to decorate the data
 * in existing `EuiTable`s to enable keyboard navigation with minimal
 * refactoring of existing code until we're ready to migrate to `EuiDataGrid`.
 * It's typically applied to `<tr>` elements via `EuiTable`'s `rowProps` prop.
 */
export const DATA_ROWINDEX_ATTRIBUTE = 'data-rowindex';

/** `aria-colindex` and `aria-rowindex` start at one */
export const FIRST_ARIA_INDEX = 1;

/** Returns `true` if the down arrow key was pressed */
export const isArrowDown = (event: React.KeyboardEvent): boolean => event.key === 'ArrowDown';

/** Returns `true` if the up arrow key was pressed */
export const isArrowUp = (event: React.KeyboardEvent): boolean => event.key === 'ArrowUp';

/** Returns `true` if the down or up arrow was pressed  */
export const isArrowDownOrArrowUp = (event: React.KeyboardEvent): boolean =>
  isArrowDown(event) || isArrowUp(event);

/** Returns `true` if the escape key was pressed */
export const isEscape = (event: React.KeyboardEvent): boolean => event.key === 'Escape';

/** Returns `true` if the tab key was pressed */
export const isTab = (event: React.KeyboardEvent): boolean => event.key === 'Tab';

/** Returns the row with the specified `aria-rowindex` */
const getRowByAriaRowindex = ({
  ariaRowindex,
  element,
  rowindexAttribute,
}: {
  ariaRowindex: number;
  element: Element | null;
  rowindexAttribute: string;
}): HTMLDivElement | null =>
  element?.querySelector<HTMLDivElement>(`[${rowindexAttribute}="${ariaRowindex}"]`) ?? null;

/** Returns the element at the specified `aria-colindex` */
const getElementWithMatchingAriaColindex = ({
  ariaColindex,
  colindexAttribute,
  element,
}: {
  ariaColindex: number;
  colindexAttribute: string;
  element: HTMLDivElement | null;
}): HTMLDivElement | null => {
  if (element?.getAttribute(colindexAttribute) === `${ariaColindex}`) {
    return element; // the current element has it
  }

  return element?.querySelector<HTMLDivElement>(`[${colindexAttribute}="${ariaColindex}"]`) ?? null;
};

interface FocusColumnResult {
  newFocusedColumn: HTMLDivElement | null;
  newFocusedColumnAriaColindex: number | null;
}

/**
 * SIDE EFFECT: mutates the DOM by focusing the specified column
 * returns the `aria-colindex` of the newly-focused column
 */
export const focusColumn = ({
  colindexAttribute,
  containerElement,
  ariaColindex,
  ariaRowindex,
  rowindexAttribute,
}: {
  colindexAttribute: string;
  containerElement: Element | null;
  ariaColindex: number;
  ariaRowindex: number;
  rowindexAttribute: string;
}): FocusColumnResult => {
  if (containerElement == null) {
    return {
      newFocusedColumnAriaColindex: null,
      newFocusedColumn: null,
    };
  }

  const row = getRowByAriaRowindex({ ariaRowindex, element: containerElement, rowindexAttribute });

  const column = getElementWithMatchingAriaColindex({
    ariaColindex,
    colindexAttribute,
    element: row,
  });

  if (column != null) {
    column.focus(); // DOM mutation side effect
    return {
      newFocusedColumnAriaColindex: ariaColindex,
      newFocusedColumn: column,
    };
  }

  return {
    newFocusedColumnAriaColindex: null,
    newFocusedColumn: null,
  };
};

export type OnColumnFocused = ({
  newFocusedColumn,
  newFocusedColumnAriaColindex,
}: {
  newFocusedColumn: HTMLDivElement | null;
  newFocusedColumnAriaColindex: number | null;
}) => void;

export const getRowRendererClassName = (ariaRowindex: number) =>
  `${ROW_RENDERER_CLASS_NAME}-${ariaRowindex}`;

/**
 * This function has side effects: It stops propagation of the provided
 * `KeyboardEvent` and prevents the browser's default behavior.
 */
export const stopPropagationAndPreventDefault = (event: React.KeyboardEvent) => {
  event.stopPropagation();
  event.preventDefault();
};

/** Returns `true` when the element, or one of it's children has focus */
export const elementOrChildrenHasFocus = (element: HTMLElement | null | undefined): boolean =>
  element === document.activeElement || element?.querySelector(':focus-within') != null;

type FocusableElement =
  | HTMLAnchorElement
  | HTMLAreaElement
  | HTMLAudioElement
  | HTMLButtonElement
  | HTMLDivElement
  | HTMLFormElement
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement
  | HTMLVideoElement;

/**
 * Returns a table cell's focusable children, which may be one of the following
 * a) a `HTMLButtonElement` that does NOT have the `disabled` attribute
 * b) an element with the `DRAGGABLE_KEYBOARD_WRAPPER_CLASS_NAME`
 */
const getFocusableChildren = (cell: HTMLElement | null) =>
  Array.from<FocusableElement>(
    cell?.querySelectorAll(
      `button:not([disabled]), button:not([tabIndex="-1"]), .${DRAGGABLE_KEYBOARD_WRAPPER_CLASS_NAME}`
    ) ?? []
  );

type SKIP_FOCUS_BACKWARDS = 'SKIP_FOCUS_BACKWARDS';
type SKIP_FOCUS_FORWARD = 'SKIP_FOCUS_FORWARD';
export type SKIP_FOCUS_NOOP = 'SKIP_FOCUS_NOOP';
type SkipFocus = SKIP_FOCUS_BACKWARDS | SKIP_FOCUS_FORWARD | SKIP_FOCUS_NOOP;

/**
 * If the value of `skipFocus` is `SKIP_FOCUS_BACKWARDS` or `SKIP_FOCUS_FORWARD`
 * this function will invoke the provided `onSkipFocusBackwards` or
 * `onSkipFocusForward` functions respectively.
 *
 * If `skipFocus` is `SKIP_FOCUS_NOOP`, the `onSkipFocusBackwards` and
 * `onSkipFocusForward` functions will not be invoked.
 */
export const handleSkipFocus = ({
  onSkipFocusBackwards,
  onSkipFocusForward,
  skipFocus,
}: {
  onSkipFocusBackwards: () => void;
  onSkipFocusForward: () => void;
  skipFocus: SkipFocus;
}): void => {
  switch (skipFocus) {
    case 'SKIP_FOCUS_BACKWARDS':
      onSkipFocusBackwards();
      break;
    case 'SKIP_FOCUS_FORWARD':
      onSkipFocusForward();
      break;
    case 'SKIP_FOCUS_NOOP': // fall through to the default, which does nothing
    default:
      break;
  }
};

/**
 * The provided `focusedCell` may contain multiple focusable children. For,
 * example, the cell may contain multiple `HTMLButtonElement`s that represent
 * actions, or the cell may contain multiple draggables.
 *
 * This function returns `true` when there are still more children of the cell
 * that should receive focus when the tab key is pressed.
 *
 * When this function returns `true`, the caller should NOT move focus away
 * from the table. Instead, the browser's "natural" focus management should be
 * allowed to automatically focus the next (or previous) focusable child of the
 * cell.
 */
const focusedCellHasMoreFocusableChildren = ({
  focusedCell,
  shiftKey,
}: {
  focusedCell: HTMLElement | null;
  shiftKey: boolean;
}): boolean => {
  const focusableChildren = getFocusableChildren(focusedCell);

  if (focusableChildren.length === 0) {
    return false; // there no children to focus
  }

  const firstOrLastChild = shiftKey
    ? focusableChildren[0]
    : focusableChildren[focusableChildren.length - 1];

  return firstOrLastChild !== document.activeElement;
};

/**
 * Returns `true` when the provided `focusedCell` has always-open hover
 * content (i.e. a hover menu)
 *
 * When this function returns true, the caller should `NOT` move focus away
 * from the table. Instead, the browser's "natural" focus management should
 * be allowed to manage focus between the table and the hover content.
 */
const focusedCellHasAlwaysOpenHoverContent = (focusedCell: HTMLElement | null): boolean =>
  focusedCell?.querySelector<HTMLDivElement>(`.${HOVER_ACTIONS_ALWAYS_SHOW_CLASS_NAME}`) != null;

type GetFocusedCell = ({
  containerElement,
  tableClassName,
}: {
  containerElement: HTMLElement | null;
  tableClassName: string;
}) => HTMLDivElement | null;

/**
 * Returns true if the focused cell is a plain, non-action `columnheader`
 */
const focusedCellIsPlainColumnHeader = (focusedCell: HTMLDivElement | null): boolean =>
  focusedCell?.getAttribute('role') === 'columnheader' &&
  !focusedCell?.classList.contains('siemEventsTable__thGroupActions');

/**
 * This function, which works with tables that use the `aria-colindex` or
 * `data-colindex` attributes, examines the focus state of the table, and
 * returns a `SkipFocus` enumeration.
 *
 * The `SkipFocus` return value indicates whether the caller should skip focus
 * to "before" the table, "after" the table, or take no action, and let the
 * browser's "natural" focus management manage focus.
 */
export const getTableSkipFocus = ({
  containerElement,
  getFocusedCell,
  shiftKey,
  tableHasFocus,
  tableClassName,
}: {
  containerElement: HTMLElement | null;
  getFocusedCell: GetFocusedCell;
  shiftKey: boolean;
  tableHasFocus: (containerElement: HTMLElement | null) => boolean;
  tableClassName: string;
}): SkipFocus => {
  if (tableHasFocus(containerElement)) {
    const focusedCell = getFocusedCell({ containerElement, tableClassName });

    if (focusedCell == null) {
      return 'SKIP_FOCUS_NOOP'; // no cells have focus, often because something with a `dialog` role has focus
    }

    if (
      focusedCellHasMoreFocusableChildren({ focusedCell, shiftKey }) &&
      !focusedCellIsPlainColumnHeader(focusedCell)
    ) {
      return 'SKIP_FOCUS_NOOP'; // the focused cell still has focusable children
    }

    if (focusedCellHasAlwaysOpenHoverContent(focusedCell)) {
      return 'SKIP_FOCUS_NOOP'; // the focused cell has always-open hover content
    }

    return shiftKey ? 'SKIP_FOCUS_BACKWARDS' : 'SKIP_FOCUS_FORWARD'; // the caller should skip focus "before" or "after" the table
  }

  return 'SKIP_FOCUS_NOOP'; // the table does NOT have focus
};

/**
 * Returns the focused cell for tables that use `aria-colindex`
 */
export const getFocusedAriaColindexCell: GetFocusedCell = ({
  containerElement,
  tableClassName,
}: {
  containerElement: HTMLElement | null;
  tableClassName: string;
}): HTMLDivElement | null =>
  containerElement?.querySelector<HTMLDivElement>(
    `.${tableClassName} [aria-colindex]:focus-within`
  ) ?? null;
