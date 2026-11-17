/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { spaceTest, tags } from '@kbn/scout-security';

/**
 * The concrete index written by SECURITY_ARCHIVES.AUDITBEAT (auditbeat_single), which this
 * config's global setup loads. Rules should target it rather than `auditbeat-*`: configs sharing
 * a CI lane share Elasticsearch, and other configs write their own `auditbeat-*` indices
 * (e.g. detection_engine's suspicious_source_event archive), which would add unexpected alerts.
 */
export const AUDITBEAT_ARCHIVE_INDEX = 'auditbeat-2022';
