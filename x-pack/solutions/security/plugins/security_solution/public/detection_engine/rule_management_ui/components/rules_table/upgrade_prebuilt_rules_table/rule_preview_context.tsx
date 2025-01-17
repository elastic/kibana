/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { invariant } from '@formatjs/intl-utils';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface RulePreviewContextActionsType {
  /**
   * Sets a field as currently being edited in the rule upgrade flyout
   */
  setFieldAsCurrentlyEdited: (fieldName: string, editing: boolean) => void;

  /**
   * Returns whether a field is currently being edited in the rule upgrade flyout
   */
  clearEditedFields: () => void;

  /**
   * Returns whether any field is currently being edited in the rule upgrade flyout
   */
  isAnyFieldCurrentlyEdited: () => boolean;
}

interface RulePreviewContextType {
  actions: RulePreviewContextActionsType;
}

const RulePreviewContext = createContext<RulePreviewContextType | null>(null);

interface RulePreviewContextProviderProps {
  children: React.ReactNode;
}

export function RulePreviewContextProvider({ children }: RulePreviewContextProviderProps) {
  const [editedFields, setEditedFields] = useState<Record<string, boolean>>({});

  const setFieldAsCurrentlyEdited = useCallback(
    (fieldName: string, isEditing: boolean) => {
      setEditedFields((prev) => {
        const updatedMap = { ...prev };
        if (isEditing) {
          updatedMap[fieldName] = true;
        } else {
          delete updatedMap[fieldName];
        }
        return updatedMap;
      });
    },
    [setEditedFields]
  );

  const clearEditedFields = useCallback(() => {
    setEditedFields({});
  }, []);

  const isAnyFieldCurrentlyEdited = useCallback(() => {
    return Object.keys(editedFields).length > 0;
  }, [editedFields]);

  const contextValue: RulePreviewContextType = useMemo(
    () => ({
      actions: {
        setFieldAsCurrentlyEdited,
        clearEditedFields,
        isAnyFieldCurrentlyEdited,
      },
    }),
    [setFieldAsCurrentlyEdited, clearEditedFields, isAnyFieldCurrentlyEdited]
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
