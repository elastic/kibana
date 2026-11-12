/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useKibanaServices } from '../hooks/use_kibana_services';

interface SideNavContextValue {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
}

const SideNavContext = createContext<SideNavContextValue | undefined>(undefined);

/** Lets a page take the width of the side navigation, e.g. for a list beside a session. */
export function SideNavProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  return (
    <SideNavContext.Provider value={{ hidden, setHidden }}>{children}</SideNavContext.Provider>
  );
}

/** Whether a page asked to hide the side navigation, for the page template. */
export const useIsSideNavHidden = (): boolean => useContext(SideNavContext)?.hidden ?? false;

/**
 * Hides the side navigation while `hide` is true and the calling page is shown: the Observability
 * solution navigation of the classic layout, or, in the project layout, collapses Kibana's side
 * navigation and restores how the user had it afterwards.
 */
export const useHideSideNav = (hide: boolean): void => {
  const setHidden = useContext(SideNavContext)?.setHidden;
  const { chrome } = useKibanaServices();

  useEffect(() => {
    if (!hide) {
      return;
    }
    setHidden?.(true);
    const isProject = chrome.getChromeStyle() === 'project';
    const wasCollapsed = isProject ? chrome.sideNav.getIsCollapsed() : true;
    if (!wasCollapsed) {
      chrome.sideNav.setIsCollapsed(true);
    }
    return () => {
      setHidden?.(false);
      if (!wasCollapsed) {
        chrome.sideNav.setIsCollapsed(false);
      }
    };
  }, [hide, setHidden, chrome]);
};
