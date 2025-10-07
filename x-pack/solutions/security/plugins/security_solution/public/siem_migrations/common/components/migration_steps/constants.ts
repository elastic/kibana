/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const SPLUNK_MACROS_COLUMNS = ['title', 'definition'] as const;

export const MACROS_SPLUNK_QUERY = `| rest /servicesNS/-/-/admin/macros count=0
| table ${SPLUNK_MACROS_COLUMNS.join(', ')}`;
