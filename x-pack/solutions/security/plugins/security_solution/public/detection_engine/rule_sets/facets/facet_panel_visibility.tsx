/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  EuiButtonIcon,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';
import type { RuleSetConditions } from '../../../../common/api/detection_engine/rule_sets';
import { allFacetFields, hasSelection } from './facet_fields';
import * as i18n from './translations';

const STORAGE_KEY = 'securitySolution.rulesTable.facetPanelOpen';

interface FacetPanelVisibility {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const FacetPanelVisibilityContext = createContext<FacetPanelVisibility>({
  isOpen: true,
  setIsOpen: () => {},
});

/** Whether the facet panel of the rules table is shown; kept per browser, like Discover's sidebar. */
export const FacetPanelVisibilityProvider = ({ children }: { children: React.ReactNode }) => {
  const [stored, setStored] = useLocalStorage<boolean>(STORAGE_KEY, true);
  const value = useMemo(
    () => ({ isOpen: stored !== false, setIsOpen: (isOpen: boolean) => setStored(isOpen) }),
    [stored, setStored]
  );
  return (
    <FacetPanelVisibilityContext.Provider value={value}>
      {children}
    </FacetPanelVisibilityContext.Provider>
  );
};

export const useFacetPanelVisibility = () => useContext(FacetPanelVisibilityContext);

/** In the panel header: hides the panel to give the table the full width. */
export const HideFacetPanelButton = () => {
  const { setIsOpen } = useFacetPanelVisibility();
  return (
    <EuiToolTip content={i18n.HIDE_FILTERS} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="transitionLeftOut"
        color="text"
        size="xs"
        aria-label={i18n.HIDE_FILTERS}
        onClick={() => setIsOpen(false)}
        data-test-subj="ruleFacetPanelHide"
      />
    </EuiToolTip>
  );
};

/** Next to the search while the panel is hidden: shows it again, with the number of used facets. */
export const ShowFacetPanelButton = ({ conditions }: { conditions: RuleSetConditions }) => {
  const { isOpen, setIsOpen } = useFacetPanelVisibility();
  if (isOpen) {
    return null;
  }
  const active = allFacetFields(undefined, conditions).filter((field) =>
    hasSelection(field.get(conditions))
  ).length;
  return (
    <EuiFlexItem grow={false}>
      <EuiFilterGroup compressed>
        <EuiFilterButton
          iconType="transitionLeftIn"
          iconSide="left"
          numActiveFilters={active}
          hasActiveFilters={active > 0}
          onClick={() => setIsOpen(true)}
          data-test-subj="ruleFacetPanelShow"
        >
          {i18n.FILTERS}
        </EuiFilterButton>
      </EuiFilterGroup>
    </EuiFlexItem>
  );
};
