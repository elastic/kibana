/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';

interface ParameterValuesContextValue {
  hideParameterValues: boolean;
  parametersAreMasked: boolean;
  revealParameterValues: () => void;
  setHideParameterValues: (hideParameterValues: boolean) => void;
}

const ParameterValuesContext = createContext<ParameterValuesContextValue | undefined>(undefined);

export const ParameterValuesProvider = ({
  children,
  hideParameterValuesByDefault,
}: React.PropsWithChildren<{ hideParameterValuesByDefault: boolean }>) => {
  const [hideParameterValues, setHideParameterValues] = useState(hideParameterValuesByDefault);
  const [parametersAreMasked, setParametersAreMasked] = useState(hideParameterValuesByDefault);

  const value = useMemo(
    () => ({
      hideParameterValues,
      parametersAreMasked,
      revealParameterValues: () => {
        setHideParameterValues(false);
        setParametersAreMasked(false);
      },
      setHideParameterValues,
    }),
    [hideParameterValues, parametersAreMasked]
  );

  return (
    <ParameterValuesContext.Provider value={value}>{children}</ParameterValuesContext.Provider>
  );
};

export const useParameterValues = (): ParameterValuesContextValue => {
  const context = useContext(ParameterValuesContext);
  if (!context) {
    throw new Error('ParameterValuesProvider is required to manage monitor parameter visibility.');
  }

  return context;
};
