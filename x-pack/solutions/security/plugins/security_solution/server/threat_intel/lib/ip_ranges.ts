/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Re-export the shared non-routable IP classifiers from `@kbn/alertzero-common`
 * so SSRF and extract_iocs stay on the same definition hunt eligibility uses.
 */
export { isNonRoutableIPv4, isNonRoutableIPv6 } from '@kbn/alertzero-common';
