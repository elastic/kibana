/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MITRE_ATTACK_API_BASE = '/internal/mitre';

export const GET_MITRE_TACTICS_ROUTE = `${MITRE_ATTACK_API_BASE}/tactics`;
export const GET_MITRE_TECHNIQUES_ROUTE = `${MITRE_ATTACK_API_BASE}/techniques`;
export const GET_MITRE_SUBTECHNIQUES_ROUTE = `${MITRE_ATTACK_API_BASE}/subtechniques`;
export const GET_MITRE_BY_ID_ROUTE = `${MITRE_ATTACK_API_BASE}/by-id/{framework}/{id}`;
export const SEARCH_MITRE_ROUTE = `${MITRE_ATTACK_API_BASE}/search`;

export const MITRE_ATTACK_API_VERSION = '1';
