/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { AssistantNavLink } from '@kbn/elastic-assistant/impl/assistant_context/assistant_nav_link';
import { API_VERSIONS } from '@kbn/elastic-assistant-common';
import { useKibana } from '../../context/typed_kibana_context/typed_kibana_context';

const DEFAULT_PLUGIN_NAME = 'securitySolutionUI';

/**
 * Conditionally renders AssistantNavLink based on agentBuilderEnabled capability.
 * If agentBuilderEnabled is true, this component renders nothing (returns null),
 * allowing security_solution's Agent Builder button to show instead.
 * If agentBuilderEnabled is false or the check fails, it renders the AssistantNavLink.
 */
export function ConditionalAssistantNavLink() {
  const { http } = useKibana().services;
  const [shouldShow, setShouldShow] = useState<boolean | null>(null); // null = checking, true/false = determined

  useEffect(() => {
    // Check capabilities asynchronously after mount
    // This allows the component to render synchronously first, then update based on capabilities
    const checkCapabilities = async () => {
      try {
        const contextHeader = encodeURIComponent(
          JSON.stringify({ type: 'application', name: DEFAULT_PLUGIN_NAME })
        );
        const capabilities = await http.get<{ agentBuilderEnabled?: boolean }>(
          '/internal/elastic_assistant/capabilities',
          {
            version: API_VERSIONS.internal.v1,
            headers: {
              'x-kbn-context': contextHeader,
            },
          }
        );

        // If agentBuilderEnabled is true, don't show this button (security_solution will show its own)
        // If false or undefined, show this button
        const isAgentBuilderEnabled = capabilities?.agentBuilderEnabled ?? false;
        setShouldShow(!isAgentBuilderEnabled);
      } catch (error) {
        // On error, default to showing the button (backward compatibility)
        // This ensures users still see the AI Assistant button if the capabilities check fails
        setShouldShow(true);
      }
    };

    checkCapabilities();
  }, [http]);

  // While checking, don't render anything (avoids flash of content)
  // Once determined, render based on shouldShow value
  if (shouldShow === null) {
    return null;
  }

  if (!shouldShow) {
    return null; // Don't render anything if agentBuilderEnabled is true
  }

  return <AssistantNavLink />;
}

