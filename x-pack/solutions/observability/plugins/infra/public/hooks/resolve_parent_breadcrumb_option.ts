/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ParentBreadcrumbOption<TLink> {
  text: string;
  link: TLink;
}

/**
 * Resolves the single parent breadcrumb used for Chrome Next compatibility back.
 * Prefers the recorded origin pathname when it maps to a known Metrics route;
 * otherwise falls back to Infrastructure Inventory.
 */
export function resolveParentBreadcrumbOption<TLink>({
  originPathname,
  breadcrumbMap,
  defaultOption,
}: {
  originPathname?: string;
  breadcrumbMap: ReadonlyMap<string, ParentBreadcrumbOption<TLink>>;
  defaultOption: ParentBreadcrumbOption<TLink>;
}): ParentBreadcrumbOption<TLink> {
  if (!originPathname) {
    return defaultOption;
  }

  return breadcrumbMap.get(originPathname) ?? defaultOption;
}
