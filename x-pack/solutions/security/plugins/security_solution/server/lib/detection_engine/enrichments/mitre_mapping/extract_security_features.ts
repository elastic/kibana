/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityFeatures } from './types';

/**
 * Extracts security-relevant fields from an alert for MITRE ATT&CK mapping.
 *
 * Maps ECS fields to a structured format that the LLM can reason about:
 * - Process execution (process.name, process.command_line)
 * - Network activity (network.protocol, source/destination IPs)
 * - File operations (file.name, file.path, file.hash)
 * - Registry modifications (registry.path, registry.value)
 *
 * @param alert - Raw security alert with ECS fields
 * @returns Structured security features for MITRE mapping
 */
export function extractSecurityFeatures(alert: Record<string, any>): SecurityFeatures {
  return {
    processName: alert['process.name'] as string | undefined,
    processCommandLine: alert['process.command_line'] as string | undefined,
    eventAction: alert['event.action'] as string | undefined,
    networkProtocol: alert['network.protocol'] as string | undefined,
    networkDirection: alert['network.direction'] as string | undefined,
    sourceIp: alert['source.ip'] as string | undefined,
    destinationIp: alert['destination.ip'] as string | undefined,
    fileName: alert['file.name'] as string | undefined,
    filePath: alert['file.path'] as string | undefined,
    fileHash: alert['file.hash.sha256'] as string | undefined,
    registryPath: alert['registry.path'] as string | undefined,
    registryValue: alert['registry.value.data'] as string | undefined,
    userDomain: alert['user.domain'] as string | undefined,
  };
}

/**
 * Checks if extracted features have sufficient data for MITRE mapping.
 * Requires at least one of: process, network, or file indicators.
 *
 * @param features - Extracted security features
 * @returns true if features have enough context for mapping
 */
export function hasSufficientContext(features: SecurityFeatures): boolean {
  const hasProcess = Boolean(features.processName);
  const hasNetwork = Boolean(features.networkProtocol);
  const hasFile = Boolean(features.fileName);
  const hasRegistry = Boolean(features.registryPath);

  return hasProcess || hasNetwork || hasFile || hasRegistry;
}
