/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';

// This suite runs on a custom server config set because it seeds synthetic MITRE data that
// must not share a Kibana process with other suites: server-side MITRE lookups are cached
// per process, so seeded entities would leak into unrelated suites (and theirs into this one).
// Custom config sets are not supported on Cloud (see docs/extend/testing/feature-flags.md),
// so only the @local- tags from tags.stateful.classic apply here.
//
// Derived by filtering tags.stateful.classic for the '@local-' prefix so the value stays in
// sync with the Scout tag helper rather than drifting as a hardcoded literal.
export const LOCAL_MANAGED_MITRE_TAGS = tags.stateful.classic.filter((tag) =>
  tag.startsWith('@local-')
);
