/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SELECT_TOOL_SHORTCUT = 'V';
export const PAN_TOOL_SHORTCUT = 'Space';
export const DISPLAY_SHORTCUT = 'D';
export const ZOOM_IN_SHORTCUT = '+';
export const ZOOM_OUT_SHORTCUT = '-';
export const FIT_TO_SCREEN_SHORTCUT = '0';
export const FULL_SCREEN_SHORTCUT = 'F';
export const CENTER_SHORTCUT = 'C';

/** @deprecated Use {@link DISPLAY_SHORTCUT} */
export const APPLY_FILTERS_SHORTCUT = DISPLAY_SHORTCUT;

export const TOOL_SHORTCUT_SEPARATOR = '   ';

export const formatToolShortcutAriaLabel = (label: string, shortcut: string): string =>
  `${label}${TOOL_SHORTCUT_SEPARATOR}${shortcut}`;

export const isEditableKeyboardTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;

  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    target.isContentEditable
  );
};

export const hasModifierKeys = (event: KeyboardEvent): boolean =>
  event.metaKey || event.ctrlKey || event.altKey;

export const isZoomInKey = (event: KeyboardEvent): boolean =>
  !hasModifierKeys(event) &&
  (event.key === '+' ||
    event.key === '=' ||
    event.code === 'NumpadAdd' ||
    event.code === 'Equal');

export const isZoomOutKey = (event: KeyboardEvent): boolean =>
  !hasModifierKeys(event) &&
  (event.key === '-' || event.code === 'Minus' || event.code === 'NumpadSubtract');

export const isFitToScreenKey = (event: KeyboardEvent): boolean =>
  !hasModifierKeys(event) && (event.code === 'Digit0' || event.code === 'Numpad0');

export const isFullScreenKey = (event: KeyboardEvent): boolean =>
  !hasModifierKeys(event) && event.code === 'KeyF';

export const isCenterKey = (event: KeyboardEvent): boolean =>
  !hasModifierKeys(event) && event.code === 'KeyC';
