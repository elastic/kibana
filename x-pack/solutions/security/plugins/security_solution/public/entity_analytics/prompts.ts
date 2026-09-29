/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Seeds the "Hunt with AI" entry point with a proactive, hypothesis-driven hunt.
// The wording intentionally mirrors the threat-hunting skill's trigger vocabulary
// (hypothesis-driven, iterative ES|QL exploration, anomaly identification, baseline
// comparison, IOC search) so the agent is more likely to select that skill. Left
// unsent (autoSendInitialMessage: false) so the analyst can add a hypothesis or
// scope before running the hunt.
export const HUNT_WITH_AI_PROMPT = `Use the threat-hunting skill to run the following hunt.

Start a proactive, hypothesis-driven threat hunt across my security data.

<Describe a hypothesis, entity, or behavior to focus on — e.g. "possible C2 beaconing from finance hosts over the last 7 days". Leave as-is to hunt broadly across recent suspicious activity.>

Work iteratively with ES|QL: state a testable hypothesis (map it to MITRE ATT&CK where possible), identify the relevant indices and fields, establish a baseline with aggregations, then drill into statistical outliers, rare events, and known IOCs. Summarize findings per entity, classify each as confirmed | suspicious | benign, and recommend concrete next steps — including any detection rules worth operationalizing. Respond in markdown.`;
