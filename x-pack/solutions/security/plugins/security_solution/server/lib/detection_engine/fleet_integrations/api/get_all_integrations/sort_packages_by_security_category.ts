/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageList } from '@kbn/fleet-plugin/common';

/**
 * Sorts packages in place
 */
export function sortPackagesBySecurityCategory(packages: PackageList): void {
  packages.sort((a, b) => {
    if (a.categories?.includes('security') && !b.categories?.includes('security')) {
      return -1;
    }

    if (!a.categories?.includes('security') && b.categories?.includes('security')) {
      return 1;
    }

    return 0;
  });
}
