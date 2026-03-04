/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { getUxHeaderAppActionsConfig } from './header_app_actions_config';

/**
 * Sets the global header overflow app actions config (••• menu) when the UX app mounts,
 * and clears it on unmount. Same content as APM (Alerts, SLOs, Settings, Feedback).
 */
export function useUxHeaderAppActions() {
  const services = useKibana().services as CoreStart;
  const chrome = services.chrome;

  useEffect(() => {
    if (!chrome?.setHeaderAppActionsConfig) return;
    chrome.setHeaderAppActionsConfig(getUxHeaderAppActionsConfig());
    return () => {
      chrome.setHeaderAppActionsConfig(undefined);
    };
  }, [chrome]);
}
