/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useKibana } from '../../hooks/use_kibana';
import { getPendingConsoleRequest$ } from '../console_usage';

const CONSOLE_MOUNT_POLL_MS = 50;
const CONSOLE_MOUNT_TIMEOUT_MS = 15000;

/** Page shell of the home and the guided setup, for every view but the shared search home. */
export const AnalyticsPageTemplate: FC<
  PropsWithChildren<{
    breadcrumb: string;
    'data-test-subj': string;
    /** Leaves the embedded Console off the page until something on the page opens it. */
    hideConsoleUntilUsed?: boolean;
  }>
> = ({ breadcrumb, children, 'data-test-subj': dataTestSubj, hideConsoleUntilUsed = false }) => {
  const {
    services: { chrome, console: consolePlugin, history, searchNavigation },
  } = useKibana();

  useEffect(() => {
    chrome.docTitle.change(breadcrumb);
    searchNavigation?.breadcrumbs.setSearchBreadCrumbs([{ text: breadcrumb }]);

    return () => {
      searchNavigation?.breadcrumbs.clearBreadcrumbs();
    };
  }, [breadcrumb, chrome, searchNavigation]);

  const pendingRequest = useObservable(
    getPendingConsoleRequest$(),
    getPendingConsoleRequest$().getValue()
  );
  const [isConsoleUsed, setIsConsoleUsed] = useState(false);
  const isConsoleMounted = !hideConsoleUntilUsed || isConsoleUsed || pendingRequest !== undefined;

  // The Console loads in its own chunk, so a request waits until it says it can be opened.
  useEffect(() => {
    if (pendingRequest === undefined) {
      return;
    }
    setIsConsoleUsed(true);
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const isReady = consolePlugin?.isEmbeddedConsoleAvailable?.() === true;
      if (isReady) {
        consolePlugin?.openEmbeddedConsole?.(pendingRequest);
      }
      if (isReady || Date.now() - startedAt > CONSOLE_MOUNT_TIMEOUT_MS) {
        clearInterval(interval);
        getPendingConsoleRequest$().next(undefined);
      }
    }, CONSOLE_MOUNT_POLL_MS);

    return () => clearInterval(interval);
  }, [pendingRequest, consolePlugin]);

  const embeddableConsole = useMemo(
    () =>
      isConsoleMounted && consolePlugin?.EmbeddableConsole ? (
        <consolePlugin.EmbeddableConsole />
      ) : null,
    [consolePlugin, isConsoleMounted]
  );

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth
      grow={false}
      data-test-subj={dataTestSubj}
      solutionNav={searchNavigation?.useClassicNavigation(history)}
    >
      {children}
      {embeddableConsole}
    </KibanaPageTemplate>
  );
};
