/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Resolve session id from resource or document attributes (EDOT Browser). */
export const SESSION_ID_SCRIPT = `
  def rum = doc.containsKey('resource.attributes.rum.sessionId') ? doc['resource.attributes.rum.sessionId'] : null;
  if (rum != null && rum.size() > 0) { return rum.value; }
  def sid = doc.containsKey('resource.attributes.session.id') ? doc['resource.attributes.session.id'] : null;
  if (sid != null && sid.size() > 0) { return sid.value; }
  def arum = doc.containsKey('attributes.rum.sessionId') ? doc['attributes.rum.sessionId'] : null;
  if (arum != null && arum.size() > 0) { return arum.value; }
  def asid = doc.containsKey('attributes.session.id') ? doc['attributes.session.id'] : null;
  if (asid != null && asid.size() > 0) { return asid.value; }
  return '';
`;
