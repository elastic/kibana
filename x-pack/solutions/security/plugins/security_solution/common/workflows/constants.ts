/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Namespaces
 */
export const WORKFLOW_STEP_NAMESPACE_SECURITY = 'security' as const;
export const WORKFLOW_STEP_NAMESPACE_SECURITY_DETECTIONS =
  `${WORKFLOW_STEP_NAMESPACE_SECURITY}.detections` as const;

/**
 * Security Steps
 */
export const WORKFLOW_STEP_ID_BUILD_ALERT_ENTITY_GRAPH =
  `${WORKFLOW_STEP_NAMESPACE_SECURITY}.buildAlertEntityGraph` as const;
export const WORKFLOW_STEP_ID_RENDER_ALERT_NARRATIVE =
  `${WORKFLOW_STEP_NAMESPACE_SECURITY}.renderAlertNarrative` as const;

/**
 * Security Detections Steps
 */
export const WORKFLOW_STEP_ID_ASSIGN_ALERT =
  `${WORKFLOW_STEP_NAMESPACE_SECURITY_DETECTIONS}.assignAlert` as const;
export const WORKFLOW_STEP_ID_ASSIGN_ATTACK =
  `${WORKFLOW_STEP_NAMESPACE_SECURITY_DETECTIONS}.assignAttack` as const;
export const WORKFLOW_STEP_ID_SET_ALERT_STATUS =
  `${WORKFLOW_STEP_NAMESPACE_SECURITY_DETECTIONS}.setAlertStatus` as const;
export const WORKFLOW_STEP_ID_SET_ATTACK_STATUS =
  `${WORKFLOW_STEP_NAMESPACE_SECURITY_DETECTIONS}.setAttackStatus` as const;
export const WORKFLOW_STEP_ID_SET_ALERT_TAGS =
  `${WORKFLOW_STEP_NAMESPACE_SECURITY_DETECTIONS}.setAlertTags` as const;
export const WORKFLOW_STEP_ID_SET_ATTACK_TAGS =
  `${WORKFLOW_STEP_NAMESPACE_SECURITY_DETECTIONS}.setAttackTags` as const;
