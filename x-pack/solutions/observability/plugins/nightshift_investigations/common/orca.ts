/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** ORCA's environment is built on the upstream demo at this commit (paper, Appendix I). */
export const ORCA_DEMO_COMMIT = 'fc77a6cbc0bf36ff52f21e4d59fa7b8a0f5d6733';

/**
 * Custom context for spaces that investigate ORCA telemetry, in the ORCA evals and on local
 * Kibanas set up with `scripts/setup_local_dev.js`. The paper's agents find the demo's source
 * checked out next to the telemetry; here it is the same public repository at the same commit.
 */
export const ORCA_SOURCE_CODE_CONTEXT = `Source code: the system is the OpenTelemetry Astronomy Shop demo, and its source is public: github.com/open-telemetry/opentelemetry-demo at commit ${ORCA_DEMO_COMMIT} (blobless clone in the sandbox with \`git clone --filter=blob:none\`, then \`git checkout ${ORCA_DEMO_COMMIT}\`; find files with \`git ls-tree\`/\`git grep\`, don't guess paths).`;

/** Sandbox egress the source code context needs: cloning the demo from GitHub. */
export const ORCA_SANDBOX_ALLOWED_HOSTS: readonly string[] = ['github.com'];
