/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { PndClientConfig } from '../../types';

/**
 * The browser-exposed PND config, as the UI reads it.
 *
 * `demo.forceIncident` is declared here — and declared **optional** — so this
 * scaffold typechecks both before and after the server-side `xpack.pnd.demo`
 * schema lands. It is an intersection rather than an `extends` clause on
 * purpose: when the server declares `demo` as required, this file needs no
 * change and does not become an incorrect extension.
 */
export type PndBrowserConfig = PndClientConfig & {
  demo?: {
    forceIncident?: boolean;
  };
};

const PndClientConfigContext = createContext<PndBrowserConfig | undefined>(undefined);

interface PndClientConfigProviderProps {
  children: React.ReactNode;
  config: PndBrowserConfig;
}

export const PndClientConfigProvider: React.FC<PndClientConfigProviderProps> = ({
  children,
  config,
}) => <PndClientConfigContext.Provider value={config}>{children}</PndClientConfigContext.Provider>;

/** The browser-exposed config, or `undefined` outside the provider. */
export const usePndClientConfig = (): PndBrowserConfig | undefined =>
  useContext(PndClientConfigContext);

/**
 * `true` only when `xpack.pnd.demo.forceIncident` is on, which means every
 * investigation is forced to an incident and the model's `isIncident` verdict
 * was bypassed.
 *
 * Defaults to `false`, matching the server default: a real run must never be
 * mislabeled as a demo, which is the direction that would mislead an analyst.
 */
export const useIsDemoMode = (): boolean => usePndClientConfig()?.demo?.forceIncident === true;
