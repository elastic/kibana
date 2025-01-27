/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { invariant } from '@formatjs/intl-utils';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface RulePreviewContextType {
  /**
   * Sets a field as currently being edited in the rule upgrade flyout
   */
  setRuleIsEdited: (fieldName: string, editing: boolean) => void;

  /**
   * Returns whether any field is currently being edited in the rule upgrade flyout
   */
  isRuleEdited: () => boolean;
}

const RulePreviewContext = createContext<RulePreviewContextType | null>(null);

interface RulePreviewContextProviderProps {
  children: React.ReactNode;
}

export function RulePreviewContextProvider({ children }: RulePreviewContextProviderProps) {
  const [editedFields, setEditedFields] = useState<Record<string, boolean>>({});

  const setRuleIsEdited = useCallback((fieldName: string, isEditing: boolean) => {
    setEditedFields((prev) => {
      const updatedMap = { ...prev };
      if (isEditing) {
        updatedMap[fieldName] = true;
      } else {
        delete updatedMap[fieldName];
      }
      return updatedMap;
    });
  }, []);

  const isRuleEdited = useCallback(() => {
    return Object.keys(editedFields).length > 0;
  }, [editedFields]);

  const contextValue: RulePreviewContextType = useMemo(
    () => ({
      setRuleIsEdited,
      isRuleEdited,
    }),
    [setRuleIsEdited, isRuleEdited]
  );

  return <RulePreviewContext.Provider value={contextValue}>{children}</RulePreviewContext.Provider>;
}

export function useRulePreviewContext() {
  const context = useContext(RulePreviewContext);

  invariant(
    context !== null,
    'useRulePreviewContext must be used inside a RulePreviewContextProvider'
  );

  return context;
}
