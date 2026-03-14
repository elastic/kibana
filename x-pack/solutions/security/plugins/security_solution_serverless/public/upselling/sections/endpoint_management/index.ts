/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

export const EndpointPolicyProtectionsLazy = lazy(() =>
  import('./endpoint_policy_protections.js').then(({ EndpointPolicyProtections }) => ({
    default: EndpointPolicyProtections,
  }))
);

export const EndpointCustomNotificationLazy = lazy(() =>
  import('./endpoint_custom_notification.js').then(({ EndpointCustomNotification }) => ({
    default: EndpointCustomNotification,
  }))
);

export const RuleDetailsEndpointExceptionsLazy = lazy(() =>
  import('./rule_details_endpoint_exceptions.js').then(({ RuleDetailsEndpointExceptions }) => ({
    default: RuleDetailsEndpointExceptions,
  }))
);

export const EndpointProtectionUpdatesLazy = lazy(() =>
  import('./endpoint_protection_updates.js').then(({ EndpointProtectionUpdates }) => ({
    default: EndpointProtectionUpdates,
  }))
);

export const EndpointAgentTamperProtectionLazy = lazy(() =>
  import('./endpoint_agent_tamper_protection.js').then(({ EndpointAgentTamperProtection }) => ({
    default: EndpointAgentTamperProtection,
  }))
);

export const EndpointDeviceControlLazy = lazy(() =>
  import('./endpoint_device_control.js').then(({ EndpointDeviceControl }) => ({
    default: EndpointDeviceControl,
  }))
);
