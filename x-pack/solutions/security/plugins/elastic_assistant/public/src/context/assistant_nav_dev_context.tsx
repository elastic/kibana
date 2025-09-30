/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

type VariantType = 'primary' | 'secondary' | 'tertiary';

interface AssistantNavDevContextType {
  variant: VariantType;
  iconOnly: boolean;
  isDevBarOpen: boolean;
  setVariant: (variant: VariantType) => void;
  setIconOnly: (iconOnly: boolean) => void;
  setIsDevBarOpen: (isOpen: boolean) => void;
  toggleDevBar: () => void;
}

const AssistantNavDevContext = createContext<AssistantNavDevContextType | undefined>(undefined);

interface AssistantNavDevProviderProps {
  children: ReactNode;
}

export const AssistantNavDevProvider: React.FC<AssistantNavDevProviderProps> = ({ children }) => {
  const [variant, setVariant] = useState<VariantType>('secondary');
  const [iconOnly, setIconOnly] = useState<boolean>(true);
  const [isDevBarOpen, setIsDevBarOpen] = useState<boolean>(false);

  const toggleDevBar = () => {
    setIsDevBarOpen(!isDevBarOpen);
  };

  const value = {
    variant,
    iconOnly,
    isDevBarOpen,
    setVariant,
    setIconOnly,
    setIsDevBarOpen,
    toggleDevBar,
  };

  return (
    <AssistantNavDevContext.Provider value={value}>
      {children}
    </AssistantNavDevContext.Provider>
  );
};

export const useAssistantNavDev = (): AssistantNavDevContextType => {
  const context = useContext(AssistantNavDevContext);
  if (context === undefined) {
    throw new Error('useAssistantNavDev must be used within an AssistantNavDevProvider');
  }
  return context;
};
