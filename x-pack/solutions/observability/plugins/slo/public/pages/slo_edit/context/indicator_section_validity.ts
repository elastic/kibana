/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

const IndicatorSectionValidityContext = createContext<boolean>(false);

/**
 * Provides the indicator section validity computed by `SloEditFormSteps` to the indicator section children.
 */
export const IndicatorSectionValidityProvider = IndicatorSectionValidityContext.Provider;

/**
 * Validity of the indicator section, as computed once by `SloEditFormSteps`; `false` outside the provider.
 */
export const useIndicatorSectionValidity = (): boolean =>
  useContext(IndicatorSectionValidityContext);
