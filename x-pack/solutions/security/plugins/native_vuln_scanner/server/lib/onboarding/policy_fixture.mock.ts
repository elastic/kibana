/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy } from '@kbn/fleet-plugin/common';

export const OSQUERY_PINNED_YAML = `agent:
  internal:
    runtime:
      default: process
      osquerybeat:
        default: process
        osquery: process
`;

interface PolicyOptions {
  id?: string;
  name?: string;
  osqueryVersion?: string | null;
  isManaged?: boolean;
  supportsAgentless?: boolean;
  agentInternal?: unknown;
}

/** An agent policy with (by default) a usable Osquery Manager integration and no runtime pin. */
export const createPolicy = ({
  id = 'policy-1',
  name = 'Policy 1',
  osqueryVersion = '1.0.0',
  isManaged = false,
  supportsAgentless = false,
  agentInternal,
}: PolicyOptions = {}): AgentPolicy =>
  ({
    id,
    name,
    is_managed: isManaged,
    supports_agentless: supportsAgentless,
    advanced_settings: agentInternal === undefined ? undefined : { agent_internal: agentInternal },
    package_policies:
      osqueryVersion === null
        ? []
        : [{ id: `${id}-osquery`, package: { name: 'osquery_manager', version: osqueryVersion } }],
  } as unknown as AgentPolicy);
