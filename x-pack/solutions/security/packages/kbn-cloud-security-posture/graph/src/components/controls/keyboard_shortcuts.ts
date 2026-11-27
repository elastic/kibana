/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export type GraphKeyboardShortcutId =
  | 'openSearch'
  | 'displayOptions'
  | 'zoomIn'
  | 'zoomOut'
  | 'fitToScreen'
  | 'centerGraph';

export interface GraphKeyboardShortcut {
  readonly id: GraphKeyboardShortcutId;
  readonly label: string;
  /** Key shown in the keyboard shortcuts panel. */
  readonly displayKey: string;
  /** Lowercased `KeyboardEvent.key` values that trigger the shortcut. */
  readonly keys: readonly string[];
  /** Whether holding the key down keeps triggering the shortcut. */
  readonly repeatable: boolean;
}

export const GRAPH_KEYBOARD_SHORTCUTS: readonly GraphKeyboardShortcut[] = [
  {
    id: 'openSearch',
    label: i18n.translate('securitySolutionPackages.csp.graph.keyboardShortcutsPanel.openSearch', {
      defaultMessage: 'Open search',
    }),
    displayKey: 'S',
    keys: ['s'],
    repeatable: false,
  },
  {
    id: 'displayOptions',
    label: i18n.translate(
      'securitySolutionPackages.csp.graph.keyboardShortcutsPanel.displayOptions',
      { defaultMessage: 'Display options' }
    ),
    displayKey: 'D',
    keys: ['d'],
    repeatable: false,
  },
  {
    id: 'zoomIn',
    label: i18n.translate('securitySolutionPackages.csp.graph.keyboardShortcutsPanel.zoomIn', {
      defaultMessage: 'Zoom in',
    }),
    displayKey: '+',
    // `=` shares the physical key with `+` on most layouts, so it works without Shift
    keys: ['+', '='],
    repeatable: true,
  },
  {
    id: 'zoomOut',
    label: i18n.translate('securitySolutionPackages.csp.graph.keyboardShortcutsPanel.zoomOut', {
      defaultMessage: 'Zoom out',
    }),
    displayKey: '-',
    keys: ['-', '_'],
    repeatable: true,
  },
  {
    id: 'fitToScreen',
    label: i18n.translate('securitySolutionPackages.csp.graph.keyboardShortcutsPanel.fitToScreen', {
      defaultMessage: 'Fit to screen',
    }),
    displayKey: '0',
    keys: ['0'],
    repeatable: false,
  },
  {
    id: 'centerGraph',
    label: i18n.translate('securitySolutionPackages.csp.graph.keyboardShortcutsPanel.centerGraph', {
      defaultMessage: 'Center graph',
    }),
    displayKey: 'C',
    keys: ['c'],
    repeatable: false,
  },
] as const;

/** Returns the shortcut bound to the given `KeyboardEvent.key`, if any. */
export const getGraphKeyboardShortcut = (key: string): GraphKeyboardShortcut | undefined => {
  const normalizedKey = key.toLowerCase();
  return GRAPH_KEYBOARD_SHORTCUTS.find(({ keys }) => keys.includes(normalizedKey));
};
