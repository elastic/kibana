/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Candidate source fields per summarized attribute, in priority order. The session summary keeps
 * the first non-empty value, so the same attribute can come from the event or resource scope. The
 * Overview filters read the same lists, so a filter value means what it does in the sessions.
 */
export const SESSION_ATTRIBUTE_FIELDS = {
  // `deployment.environment.name` replaces the deprecated `deployment.environment`, which
  // `service.environment` aliases. These are the fields of `ENVIRONMENT_FIELDS` in
  // `server/lib/otel/queries.ts`, by their stored names, which the raw search of the applications
  // list matches. A session keeps the first one that an event has, where the raw search matches
  // any, so they only differ for an application that sets different values in them.
  environment: [
    'resource.attributes.deployment.environment.name',
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
  // `client.geo.*` is what an Elasticsearch GeoIP ingest processor writes; `geo.*` is what the
  // Collector's GeoIP processor writes, on the resource by default, from `client.address`.
  countryIso: [
    'attributes.client.geo.country_iso_code',
    'resource.attributes.client.geo.country_iso_code',
    'resource.attributes.geo.country.iso_code',
    'attributes.geo.country.iso_code',
  ],
  region: [
    'attributes.client.geo.region_name',
    'resource.attributes.client.geo.region_name',
    'resource.attributes.geo.region_name',
    'attributes.geo.region_name',
  ],
  city: [
    'attributes.client.geo.city_name',
    'resource.attributes.client.geo.city_name',
    'resource.attributes.geo.city_name',
    'attributes.geo.city_name',
  ],
  // A `geo_point`: the OTel index templates map any `*.geo.location` as one, and the Elasticsearch
  // exporter merges the Collector's `geo.location.lat` and `geo.location.lon` into it.
  location: [
    'attributes.client.geo.location',
    'resource.attributes.client.geo.location',
    'resource.attributes.geo.location',
    'attributes.geo.location',
  ],
} as const;

export type SessionAttribute = keyof typeof SESSION_ATTRIBUTE_FIELDS;
