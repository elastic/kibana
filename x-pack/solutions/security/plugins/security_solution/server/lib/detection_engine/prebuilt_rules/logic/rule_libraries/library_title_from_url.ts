/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A name for a library until its first refresh reads the real one from its manifest.
export const getLibraryTitleFromUrl = (url: string): string =>
  url
    .replace(/\.git$/, '')
    .split(/[/:]/)
    .filter(Boolean)
    .pop() ?? url;
