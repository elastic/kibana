/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAllRelayAppBindings } from '../../../settings/components/apps_section/use_relay_app_bindings';

/** Ids of this deployment's connected private channels, which automations can't use yet. */
export const usePrivateChannelIds = (): ReadonlySet<string> => {
  const { bindings } = useAllRelayAppBindings();
  return useMemo(
    () =>
      new Set(
        bindings.flatMap(({ channel, visibility }) =>
          channel != null && visibility === 'private' ? [channel] : []
        )
      ),
    [bindings]
  );
};
