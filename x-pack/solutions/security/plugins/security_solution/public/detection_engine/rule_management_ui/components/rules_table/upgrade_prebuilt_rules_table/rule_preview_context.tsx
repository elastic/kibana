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
   * Sets the rule is being edited in the rule upgrade flyout
   */
  setRuleIsEdited: (editing: boolean) => void;

  /**
   * Returns whether the rule is being edited in the rule upgrade flyout
   */
  isRuleEdited: boolean;
}

const RulePreviewContext = createContext<RulePreviewContextType | null>(null);

interface RulePreviewContextProviderProps {
  children: React.ReactNode;
}

export function RulePreviewContextProvider({ children }: RulePreviewContextProviderProps) {
  const [editedFields, setEditedFields] = useState<number>(0);

  const setRuleIsEdited = useCallback((isEditing: boolean) => {
    setEditedFields((prev) => {
      return isEditing ? prev + 1 : prev - 1;
    });
  }, []);

  const contextValue: RulePreviewContextType = useMemo(
    () => ({
      setRuleIsEdited,
      isRuleEdited: editedFields > 0,
    }),
    [setRuleIsEdited, editedFields]
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
