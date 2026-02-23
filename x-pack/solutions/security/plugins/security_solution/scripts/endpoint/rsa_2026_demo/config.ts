/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rsa2026DemoConfig } from './types';

export const DEFAULT_CONFIG: Rsa2026DemoConfig = {
    defendOsqueryCount: 1, // Local dev default
    osqueryOnlyCount: 1, // Local dev default
    maliciousDomain: 'digert.ictnsc.com',
    username: 'patryk',
    browserHistoryTimestamp: Date.now() * 1000, // Convert to microseconds
    createDetectionRule: true,
    createWorkflow: true,
    enableGui: true,
    vmGuiUser: 'ubuntu',
    vmGuiPassword: 'changeme',
};

export const PRODUCTION_CONFIG: Rsa2026DemoConfig = {
    ...DEFAULT_CONFIG,
    defendOsqueryCount: 5,
    osqueryOnlyCount: 5,
};

/**
 * Creates a fixed timestamp for browser history entries
 * Uses a fixed date for demo consistency: 2024-01-15 10:30:00 UTC
 */
export const getFixedBrowserHistoryTimestamp = (): number => {
    // Fixed timestamp: 2024-01-15 10:30:00 UTC in microseconds
    return new Date('2024-01-15T10:30:00Z').getTime() * 1000;
};

/**
 * Merges user config with defaults
 */
export const mergeConfig = (userConfig: Partial<Rsa2026DemoConfig>): Rsa2026DemoConfig => {
    const baseConfig = userConfig.defendOsqueryCount === 5 && userConfig.osqueryOnlyCount === 5
        ? PRODUCTION_CONFIG
        : DEFAULT_CONFIG;

    return {
        ...baseConfig,
        ...userConfig,
        browserHistoryTimestamp: userConfig.browserHistoryTimestamp ?? getFixedBrowserHistoryTimestamp(),
    };
};

