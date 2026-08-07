/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutServerConfig } from '@kbn/scout';
import { servers as evalsTracingConfig } from '@kbn/scout/src/servers/configs/config_sets/evals_tracing/stateful/classic.stateful.config';

/**
 * Scout stateful server configuration for the detection rule preview eval suite.
 * Extends evals_tracing with Agent Builder experimental features and the
 * rulePreviewAttachmentEnabled flag so the `run_rule_preview` tool and
 * `security.rule.preview` attachment register at boot time.
 */
export const servers: ScoutServerConfig = {
  ...evalsTracingConfig,
  kbnTestServer: {
    ...evalsTracingConfig.kbnTestServer,
    serverArgs: [
      ...evalsTracingConfig.kbnTestServer.serverArgs,
      '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
      `--xpack.securitySolution.enableExperimental=${JSON.stringify([
        'rulePreviewAttachmentEnabled',
      ])}`,
    ],
  },
};
