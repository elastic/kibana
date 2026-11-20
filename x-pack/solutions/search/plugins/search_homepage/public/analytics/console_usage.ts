/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';

const pendingConsoleRequest$ = new BehaviorSubject<string | undefined>(undefined);

/** The request waiting for a page to mount the embedded Console and open it. */
export const getPendingConsoleRequest$ = (): BehaviorSubject<string | undefined> =>
  pendingConsoleRequest$;

const isMounted = (consolePlugin: ConsolePluginStart): boolean =>
  consolePlugin.isEmbeddedConsoleAvailable?.() === true;

/** Whether the embedded Console can be opened here, mounted already or not. */
export const canOpenPageConsole = (consolePlugin: ConsolePluginStart | undefined): boolean =>
  consolePlugin?.openEmbeddedConsole !== undefined &&
  (isMounted(consolePlugin) || consolePlugin.EmbeddableConsole !== undefined);

/**
 * Opens the embedded Console with a request. A page that keeps the Console unmounted until it is
 * needed mounts it for this. Returns false where there is no embedded Console to open.
 */
export const openPageConsole = (
  consolePlugin: ConsolePluginStart | undefined,
  content: string
): boolean => {
  if (consolePlugin === undefined || !canOpenPageConsole(consolePlugin)) {
    return false;
  }
  if (isMounted(consolePlugin)) {
    consolePlugin.openEmbeddedConsole?.(content);
  } else {
    pendingConsoleRequest$.next(content);
  }

  return true;
};
