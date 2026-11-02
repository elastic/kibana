/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DIAGNOSTIC_REPORT_ATTACHMENT_TYPE = 'diagnostic_report';

/**
 * By-reference attachment type for an Attack Discovery. The attachment's `origin`
 * is the persisted document id, which equals `kibana.alert.uuid`.
 */
export const ATTACK_DISCOVERY_ATTACHMENT_TYPE = 'security.attack_discovery';

/**
 * By-value attachment type for the FP/TP verdict about an Attack Discovery. Written
 * by the review after the analysis runs, separate from the evidence it was drawn
 * from.
 */
export const ATTACK_DISCOVERY_VERDICT_ATTACHMENT_TYPE = 'security.attack_discovery.verdict';
