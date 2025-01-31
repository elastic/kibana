/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityPageName } from '@kbn/security-solution-navigation';

export type PageUpsellings = Partial<Record<SecurityPageName, React.ComponentType>>;
export type MessageUpsellings = Partial<Record<UpsellingMessageId, string>>;
export type SectionUpsellings = Partial<Record<UpsellingSectionId, React.ComponentType>>;

export type UpsellingSectionId =
  | 'entity_analytics_panel'
  | 'endpointPolicyProtections'
  | 'osquery_automated_response_actions'
  | 'endpoint_protection_updates'
  | 'endpoint_agent_tamper_protection'
  | 'endpoint_custom_notification'
  | 'cloud_security_posture_integration_installation'
  | 'ruleDetailsEndpointExceptions'
  | 'automatic_import';

export type UpsellingMessageId =
  | 'investigation_guide'
  | 'investigation_guide_interactions'
  | 'alert_assignments'
  | 'alert_suppression_rule_form'
  | 'alert_suppression_rule_details'
  | 'note_management_user_filter'
  | 'prebuilt_rule_customization';
