/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type VariantType = 'primary' | 'secondary' | 'tertiary';

interface AssistantNavDevState {
  variant: VariantType;
  iconOnly: boolean;
  isDevBarOpen: boolean;
}

interface AssistantNavDevContextType extends AssistantNavDevState {
  setVariant: (variant: VariantType) => void;
  setIconOnly: (iconOnly: boolean) => void;
  setIsDevBarOpen: (isOpen: boolean) => void;
  toggleDevBar: () => void;
}

// Singleton state manager
class AssistantNavDevStateManager {
  private state: AssistantNavDevState = {
    variant: 'secondary',
    iconOnly: true,
    isDevBarOpen: false,
  };

  private listeners = new Set<() => void>();

  getState(): AssistantNavDevState {
    return { ...this.state };
  }

  setState(newState: Partial<AssistantNavDevState>): void {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach(listener => listener());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

// Global singleton instance
const stateManager = new AssistantNavDevStateManager();

const AssistantNavDevContext = createContext<AssistantNavDevContextType | undefined>(undefined);

interface AssistantNavDevProviderProps {
  children: ReactNode;
}

export const AssistantNavDevSingletonProvider: React.FC<AssistantNavDevProviderProps> = ({ children }) => {
  const [state, setLocalState] = useState<AssistantNavDevState>(() => stateManager.getState());

  useEffect(() => {
    const unsubscribe = stateManager.subscribe(() => {
      setLocalState(stateManager.getState());
    });
    return unsubscribe;
  }, []);

  const setVariant = (variant: VariantType) => {
    stateManager.setState({ variant });
  };

  const setIconOnly = (iconOnly: boolean) => {
    stateManager.setState({ iconOnly });
  };

  const setIsDevBarOpen = (isDevBarOpen: boolean) => {
    stateManager.setState({ isDevBarOpen });
  };

  const toggleDevBar = () => {
    stateManager.setState({ isDevBarOpen: !state.isDevBarOpen });
  };

  const value: AssistantNavDevContextType = {
    ...state,
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

export const useAssistantNavDevSingleton = (): AssistantNavDevContextType => {
  const context = useContext(AssistantNavDevContext);
  if (context === undefined) {
    throw new Error('useAssistantNavDevSingleton must be used within an AssistantNavDevSingletonProvider');
  }
  return context;
};
