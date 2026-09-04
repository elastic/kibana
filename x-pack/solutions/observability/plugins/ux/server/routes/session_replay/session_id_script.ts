/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Resolve the rotated session id (attributes first; resource is a startup snapshot). */
export const SESSION_ID_SCRIPT = `
  def asid = doc.containsKey('attributes.session.id') ? doc['attributes.session.id'] : null;
  if (asid != null && asid.size() > 0) { return asid.value; }
  def arum = doc.containsKey('attributes.rum.sessionId') ? doc['attributes.rum.sessionId'] : null;
  if (arum != null && arum.size() > 0) { return arum.value; }
  def sid = doc.containsKey('resource.attributes.session.id') ? doc['resource.attributes.session.id'] : null;
  if (sid != null && sid.size() > 0) { return sid.value; }
  def rum = doc.containsKey('resource.attributes.rum.sessionId') ? doc['resource.attributes.rum.sessionId'] : null;
  if (rum != null && rum.size() > 0) { return rum.value; }
  return '';
`;

/** Session id on rrweb OTLP logs (`logs-rum.replay-*`). */
export const REPLAY_SESSION_ID_SCRIPT = `
  def rum = doc.containsKey('attributes.rum.sessionId') ? doc['attributes.rum.sessionId'] : null;
  if (rum != null && rum.size() > 0) { return rum.value; }
  def sid = doc.containsKey('attributes.session.id') ? doc['attributes.session.id'] : null;
  if (sid != null && sid.size() > 0) { return sid.value; }
  return '';
`;

/** Service name on rrweb OTLP logs. */
export const REPLAY_SERVICE_NAME_SCRIPT = `
  def resource = doc.containsKey('resource.attributes.service.name') ? doc['resource.attributes.service.name'] : null;
  if (resource != null && resource.size() > 0) { return resource.value; }
  def attr = doc.containsKey('attributes.service.name') ? doc['attributes.service.name'] : null;
  if (attr != null && attr.size() > 0) { return attr.value; }
  return '';
`;
