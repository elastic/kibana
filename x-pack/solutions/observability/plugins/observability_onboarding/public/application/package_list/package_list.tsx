/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import React, { Suspense, lazy } from 'react';

export const LazyPackageList = lazy(async () => ({
  default: await import('@kbn/fleet-plugin/public')
    .then((module) => module.PackageList())
    .then((pkg) => pkg.PackageListGrid),
}));

interface Props {
  list: IntegrationCardItem[];
  searchTerm?: string;
}

export function PackageList({ list, searchTerm = '' }: Props) {
  return (
    /**
     * Suspense wrapper is required by PackageListGrid, but
     * Onboarding does not need it because it pre-loads all
     * packages beforehand with a custom loading state.
     */
    <Suspense fallback={<></>}>
      <LazyPackageList
        list={list}
        searchTerm={searchTerm}
        showControls={false}
        showSearchTools={false}
        // we either don't need these properties (yet) or handle them upstream, but
        // they are marked as required in the original API.
        selectedCategory=""
        setSearchTerm={() => {}}
        setCategory={() => {}}
        categories={[]}
        setUrlandReplaceHistory={() => {}}
        setUrlandPushHistory={() => {}}
        showCardLabels={true}
      />
    </Suspense>
  );
}
