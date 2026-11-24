/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Windows build ordering: `<major>.<minor>.<build>.<ubr>` (for example `10.0.19045.7846`) compared
 * numerically per component, plus a sortable key whose plain byte order equals that order.
 */

import { encodeNumber, sign, trimVersion, UnencodableVersionError } from './common';
import type { Ordering } from './common';

export interface WindowsBuild {
  readonly major: number;
  readonly minor: number;
  readonly build: number;
  readonly ubr: number;
}

const WINDOWS_BUILD = /^(\d{1,9})\.(\d{1,9})\.(\d{1,9})\.(\d{1,9})$/;

/** Parses `<major>.<minor>.<build>.<ubr>`; anything else cannot be ordered and throws. */
export const parseWindowsBuild = (raw: string): WindowsBuild => {
  const match = WINDOWS_BUILD.exec(trimVersion(raw));
  if (!match) throw new UnencodableVersionError(`not a Windows build: ${raw}`);
  const [major, minor, build, ubr] = match.slice(1).map(Number);
  return { major, minor, build, ubr };
};

const COMPONENTS = ['major', 'minor', 'build', 'ubr'] as const;

export const compareWindowsBuild = (a: string, b: string): Ordering => {
  const x = parseWindowsBuild(a);
  const y = parseWindowsBuild(b);
  for (const component of COMPONENTS) {
    const diff = sign(x[component] - y[component]);
    if (diff !== 0) return diff;
  }
  return 0;
};

/** Length-prefixed sortable key: each component is its digit count then its digits, so `.999` < `.7846`. */
export const windowsBuildKey = (raw: string): string => {
  const parsed = parseWindowsBuild(raw);
  return COMPONENTS.map((component) => encodeNumber(String(parsed[component]))).join('.');
};
