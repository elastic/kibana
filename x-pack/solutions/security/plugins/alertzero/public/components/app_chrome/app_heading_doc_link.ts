/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext, useLayoutEffect } from 'react';
import type { AlertZeroDocumentationPage } from '../../hooks/use_alertzero_documentation_link';

/** Lets a page choose which documentation page the app heading links to. */
export const AppHeadingDocLinkContext = createContext<
  (page: AlertZeroDocumentationPage | undefined) => void
>(() => {});

/**
 * Points the app heading's Documentation link at `page` while the calling page is mounted.
 * The layout falls back to the AlertZero overview otherwise.
 */
export const useAppHeadingDocLink = (page: AlertZeroDocumentationPage): void => {
  const setPage = useContext(AppHeadingDocLinkContext);

  useLayoutEffect(() => {
    setPage(page);
    return () => setPage(undefined);
  }, [setPage, page]);
};
