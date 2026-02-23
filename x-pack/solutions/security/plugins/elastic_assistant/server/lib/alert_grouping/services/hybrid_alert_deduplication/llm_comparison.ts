/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * LLM-based alert comparison for the Hybrid Alert Deduplication system.
 *
 * Uses an LLM to determine if two security alerts are near-duplicates,
 * applying security-specific heuristics and structured output parsing.
 *
 * The LLM invocation is abstracted behind an `LLMInvokeFn` interface so that
 * callers can plug in any provider (AWS Bedrock, OpenAI, Kibana connectors, etc.)
 *
 * Ported from https://github.com/elastic/alert-clustering
 */

import type { Logger } from '@kbn/logging';

import type { AlertDocument, LLMComparisonResult, LLMInvokeFn } from './types';
import { getVal, cleanupAlertFields } from './utils';

// ============================================================
// Prompt templates
// ============================================================

const PROMPT_HEADER = `
    Your task is to determine if 2 security alerts are near duplicates. The goal is to reduce the number of alerts a security analyst is required to triage. 
    Also, common fields across clusters of duplicate false positives can be used to generate effective exceptionlists to ignore the activity.
    You will return a json structure that signals if the alerts are duplicates. If the alerts are duplicates, include a list of field names that 
    are similar in each alert.
    `;

const PROMPT_BODY = `
1. **Same Attack Technique = Duplicate (Key Principle)**:
   - Alerts that represent the SAME MITRE ATT&CK technique or sub-technique executed in a similar manner ARE duplicates, even if the exact process arguments, file paths, or binary names differ slightly.
   - For example: two base64-decoded payload executions, two reverse shell attempts, or two user-discovery commands are duplicates if they represent the same class of suspicious activity triggered by the same detection rule.
   - Focus on WHAT is being achieved (the attack technique), not minor variations in HOW (exact arguments, paths, timestamps).

2. **Parent Process / Attack Script Context**:
   - When alerts share the same parent process path or command line (e.g., same automation framework, same attack script), they are very likely part of the same attack campaign and should be treated as duplicates.
   - Small variations in child process arguments within the same parent execution context are expected and do NOT make alerts unique.

3. **Command Line Intent is Critical, especially for common system binaries**:
   - Even if the same process (cmd.exe, powershell.exe, wscript.exe, rundll32.exe) is involved, the specific operations being performed determine uniqueness
   - Examine the full path of scripts being executed and their purposes. Scripts in vastly different directories or names are unlikely to be related

4. **More Detailed Command Analysis**:
   - Analyze what the commands are trying to achieve, not just their syntactic structure
   - Commands that target different system resources (credentials vs downloading files) are unrelated
   - Commands using different attack primitives (rundll32+comsvcs.dll vs curl+batch files) represent different TTPs
   - The actions of the alerting process are more important than similarities in how they were launched (parent processes)

5. **Superficial Similarities are Misleading**:
   - Similar parent processes (services.exe), integrity levels (system), and process names (cmd.exe) alone do not make alerts duplicates
   - These are common elements in many Windows attacks and don't indicate the same attack instance
   
6. **Function and Purpose Override Structure**:
   - The purpose of the command (what it's trying to achieve) outweighs structural similarities
   - Commands with different tactical goals should be considered unrelated even if syntactically similar

7. **Code Signature Differences**:
   - Signed vs unsigned binaries represent different risk profiles and likely different software packages
   - Different publisher names in code signatures indicate unrelated software activities

8. **Expect some similarities to exist**
   - These alerts have already been grouped based on the rule name and logic that triggered them.
   - Don't consider similar rule.name, rule.id, or similarities that may be inherent to the same rule logic triggering as strong factors
   
9. **Do not group based on the following fields**
   - Host names. Enterprises have many unique users and hosts that can trigger related false positives.
   - Hashes can generally be ignored, since they will vary across versions of the same software
   - Do not consider temporal similarities when forming groups
   - User names and IDs can be ignored, except when they signify system vs user identifiers or if it is for an identify specific alert (ex user account lockout alert)

10. **Lean Toward Grouping When Rule Names Match**:
    - Since these alerts already share the same rule name, there is a strong prior that they are related.
    - Only mark alerts as "unrelated" if there is a CLEAR functional difference in what the commands are doing (different attack technique, different target resource, fundamentally different behavior).
    - If both alerts are doing the same category of suspicious activity (e.g., both are reverse shells, both are base64 decoding, both are user enumeration), they ARE duplicates.

11. **When in Doubt, Group Together**:
    - Since these are already same-rule alerts, the cost of over-splitting (creating too many clusters) is higher than the cost of over-grouping.
    - Over-splitting defeats the purpose of deduplication and wastes analyst time.
    - An attacker exploiting cluster membership would need to trigger the exact same detection rule, which already limits the blast radius.
    
    Alerts follow:
    
`;

const PROMPT_FOOTER = `
    **OUTPUT FORMAT**
    Your output should be formatted like the following, with a marker and then valid json:
    <result_marker>
    {"duplicate": true, "common_fields": ["process.executable", "process.command_line"]}
    </result_marker>
`;

// ============================================================
// LLM Comparison
// ============================================================

/**
 * Compare two or more alerts using an LLM to determine if they are duplicates.
 *
 * The function prepares a prompt with the alert data, sends it to the LLM,
 * and parses the structured response.
 *
 * @param alerts - Two alerts to compare
 * @param invokeLLM - The LLM invocation function
 * @param logger - Logger instance
 * @returns Comparison result or undefined if the LLM response was unparseable
 */
export const clusterLLM = async (
  alerts: AlertDocument[],
  invokeLLM: LLMInvokeFn,
  logger: Logger
): Promise<LLMComparisonResult | undefined> => {
  const allAlertIds: string[] = [];

  for (const a of alerts) {
    const alert = cleanupAlertFields(a);
    const alertId = getVal(alert, 'event.id');

    if (alertId != null && allAlertIds.includes(String(alertId))) {
      logger.warn('Duplicate alert on input!');
      return { duplicate: true, common_fields: [] };
    }

    if (alertId != null) {
      allAlertIds.push(String(alertId));
    }
  }

  // Build the prompt
  const prompt =
    PROMPT_HEADER +
    PROMPT_BODY +
    alerts.map((alert) => JSON.stringify(cleanupAlertFields(alert))).join('\n') +
    '\n' +
    PROMPT_FOOTER;

  logger.debug(`Sending ${alerts.length} alerts to LLM for comparison`);

  let response: string;
  try {
    response = await invokeLLM('', prompt);
  } catch (error) {
    logger.error(`LLM invocation failed: ${error}`);
    return undefined;
  }

  logger.debug(`LLM response: ${response.slice(0, 200)}...`);

  // Parse the structured response
  const startMarker = '<result_marker>';
  const endMarker = '</result_marker>';
  const start = response.indexOf(startMarker);
  const end = response.indexOf(endMarker);

  if (start < 0 || end <= 0) {
    logger.error('Invalid response format from LLM: missing result markers');
    return undefined;
  }

  const responseJson = response.slice(start + startMarker.length, end).trim();

  try {
    const result = JSON.parse(responseJson) as LLMComparisonResult;
    return result;
  } catch {
    logger.error(`Error parsing JSON from LLM response: ${responseJson}`);
    return undefined;
  }
};

/**
 * Determine if two alerts are near-duplicates using the LLM.
 * A simplified wrapper around `clusterLLM` that returns a boolean.
 */
export const neighborsLLM = async (
  alert1: AlertDocument,
  alert2: AlertDocument,
  invokeLLM: LLMInvokeFn,
  logger: Logger
): Promise<boolean> => {
  const response = await clusterLLM([alert1, alert2], invokeLLM, logger);
  return response?.duplicate ?? false;
};

// ============================================================
// Prompt access (for testing / customization)
// ============================================================

/** Get the full prompt header */
export const getPromptHeader = (): string => PROMPT_HEADER;

/** Get the full prompt body (instructions) */
export const getPromptBody = (): string => PROMPT_BODY;

/** Get the full prompt footer (output format) */
export const getPromptFooter = (): string => PROMPT_FOOTER;
