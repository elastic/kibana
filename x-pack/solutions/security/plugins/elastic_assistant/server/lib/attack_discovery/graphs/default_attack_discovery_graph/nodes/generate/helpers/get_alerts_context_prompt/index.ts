/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// NOTE: we ask the LLM to `provide insights`. We do NOT use the feature name, `AttackDiscovery`, in the prompt.
export const getAlertsContextPrompt = ({
  anonymizedAlerts,
  attackDiscoveryPrompt,
}: {
  anonymizedAlerts: string[];
  attackDiscoveryPrompt: string;
}) => `${attackDiscoveryPrompt}

Use context from the following alerts to provide insights:

"""
${anonymizedAlerts.join('\n\n')}
"""
`;
