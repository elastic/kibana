/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';

// Explicit local-only tag: this suite requires a custom server config set
// (xpack.mitreAttack.managedSourceEnabled=true), and custom config sets are not
// supported on Cloud (see docs/extend/testing/feature-flags.md). Revert to
// tags.stateful.classic when this moves onto the default config set.
//
// Derived by filtering tags.stateful.classic for the '@local-' prefix so the
// value stays in sync with the Scout tag helper rather than drifting as a
// hardcoded literal.
export const LOCAL_MANAGED_MITRE_TAGS = tags.stateful.classic.filter((tag) =>
  tag.startsWith('@local-')
);
