/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared tool instructions for Entity Analytics tools.
 * These instructions ensure consistent behavior across all tools that deal with risk scores,
 * asset criticality, and other entity analytics concepts.
 */

/**
 * Instruction for correctly interpreting and reporting risk scores.
 * Should be included in any tool that returns risk score data.
 */
export const RISK_SCORE_INSTRUCTION = `IMPORTANT: Always use 'calculated_score_norm' (0-100) when reporting risk scores, NOT 'calculated_score' which is a raw value. The 'calculated_score_norm' field is the normalized score suitable for comparison between entities.`;

/**
 * Instruction explaining risk score modifiers.
 * Should be included in tools that return detailed risk score data with modifiers.
 */
export const RISK_MODIFIERS_INSTRUCTION = `The 'modifiers' array contains risk adjustments such as asset criticality and privileged user monitoring (watchlist/privmon type).`;

/**
 * Instruction explaining available risk levels for filtering.
 */
export const RISK_LEVELS_INSTRUCTION = `Risk levels: Critical, High, Moderate, Low, Unknown.`;

/**
 * Instruction explaining asset criticality levels.
 */
export const ASSET_CRITICALITY_INSTRUCTION = `Asset criticality levels: extreme_impact, high_impact, medium_impact, low_impact.`;

/**
 * Combined instructions for tools that return comprehensive risk data.
 */
export const RISK_SCORE_FULL_INSTRUCTIONS = `${RISK_SCORE_INSTRUCTION} ${RISK_MODIFIERS_INSTRUCTION}`;
