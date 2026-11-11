/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Candidate source fields per summarized attribute, in priority order. The dest
 * pipeline keeps the first non-empty value, so the same attribute can come from
 * the event or resource scope. The Overview filters read the same lists, so a filter value
 * means what it does in the sessions.
 */
export const SESSION_ATTRIBUTE_FIELDS = {
  // `deployment.environment.name` replaces the deprecated `deployment.environment`, which
  // `service.environment` aliases; the applications list reads both.
  environment: [
    'resource.attributes.deployment.environment.name',
    'attributes.deployment.environment.name',
    'resource.attributes.deployment.environment',
  ],
  user: [
    'attributes.user.email',
    'resource.attributes.user.email',
    'attributes.user.id',
    'resource.attributes.user.id',
    'attributes.user.name',
    'resource.attributes.user.name',
  ],
  browser: [
    'resource.attributes.browser.name',
    'attributes.browser.name',
    'resource.attributes.user_agent.name',
    'attributes.user_agent.name',
  ],
  browserVersion: [
    'resource.attributes.browser.version',
    'attributes.browser.version',
    'resource.attributes.user_agent.version',
    'attributes.user_agent.version',
  ],
  os: [
    'resource.attributes.os.name',
    'attributes.os.name',
    'resource.attributes.browser.platform',
    'attributes.browser.platform',
  ],
  device: [
    'resource.attributes.device.model.name',
    'attributes.device.model.name',
    'resource.attributes.device.type',
  ],
  countryIso: [
    'attributes.client.geo.country_iso_code',
    'resource.attributes.client.geo.country_iso_code',
  ],
  region: ['attributes.client.geo.region_name', 'resource.attributes.client.geo.region_name'],
  city: ['attributes.client.geo.city_name', 'resource.attributes.client.geo.city_name'],
} as const;
