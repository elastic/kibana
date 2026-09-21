/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';

interface ParameterValuesContextValue {
  parametersAreMasked: boolean;
  plaintextSnapshot?: string;
  revealParameterValues: (plaintext?: string) => void;
}

const ParameterValuesContext = createContext<ParameterValuesContextValue | undefined>(undefined);

export const ParameterValuesProvider = ({
  children,
  hideParameterValuesByDefault,
}: React.PropsWithChildren<{ hideParameterValuesByDefault: boolean }>) => {
  const [parametersAreMasked, setParametersAreMasked] = useState(hideParameterValuesByDefault);
  const [plaintextSnapshot, setPlaintextSnapshot] = useState<string | undefined>();

  const value = useMemo(
    () => ({
      parametersAreMasked,
      plaintextSnapshot,
      revealParameterValues: (plaintext?: string) => {
        setParametersAreMasked(false);
        if (plaintext !== undefined) {
          setPlaintextSnapshot(plaintext);
        }
      },
    }),
    [parametersAreMasked, plaintextSnapshot]
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
