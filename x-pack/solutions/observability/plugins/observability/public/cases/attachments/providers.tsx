/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import { EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { PluginContextValue } from '../../context/plugin_context/plugin_context';
import { PluginContext } from '../../context/plugin_context/plugin_context';
import type { ObservabilityPublicPluginsStart } from '../../plugin';

export interface ObservabilityAttachmentContext {
  core: CoreStart;
  plugins: ObservabilityPublicPluginsStart;
  pluginContext: PluginContextValue;
}

/**
 * Gives Observability's case attachment renderers the services and plugin context they get inside
 * the Observability app, for when they render in the top-level Cases app.
 */
const LOAD_ERROR = i18n.translate('xpack.observability.cases.attachments.providers.loadError', {
  defaultMessage: "This attachment couldn't load. Refresh the page to try again.",
});

export const createCaseAttachmentProviders = (
  resolveContext: () => Promise<ObservabilityAttachmentContext>
): FC<{ children: ReactNode }> => {
  // Every attachment on a case mounts these providers; once resolved, later mounts render at once.
  let resolved: ObservabilityAttachmentContext | undefined;

  const CaseAttachmentProviders: FC<{ children: ReactNode }> = ({ children }) => {
    const [context, setContext] = useState(resolved);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
      if (context) {
        return;
      }
      let cancelled = false;
      resolveContext().then(
        (next) => {
          resolved = next;
          if (!cancelled) {
            setContext(next);
          }
        },
        () => {
          if (!cancelled) {
            setFailed(true);
          }
        }
      );
      return () => {
        cancelled = true;
      };
    }, [context]);

    const services = useMemo(
      () =>
        context
          ? { ...context.core, ...context.plugins, storage: new Storage(localStorage) }
          : undefined,
      [context]
    );

    if (failed) {
      return (
        <EuiText size="s" color="subdued">
          {LOAD_ERROR}
        </EuiText>
      );
    }

    if (!context || !services) {
      return <EuiLoadingSpinner size="m" />;
    }

    return (
      <KibanaContextProvider services={services}>
        <PluginContext.Provider value={context.pluginContext}>{children}</PluginContext.Provider>
      </KibanaContextProvider>
    );
  };
  CaseAttachmentProviders.displayName = 'ObservabilityCaseAttachmentProviders';
  return CaseAttachmentProviders;
};
