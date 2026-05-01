/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Attachment type identifier for the Agent Builder × Synthetics monitor
 * authoring/management integration.
 *
 * Distinct from `OBSERVABILITY_MONITOR_ATTACHMENT_TYPE_ID`
 * (`'observability.synthetics_monitor'`) which is the **preset-context**
 * attachment surfaced by the `observability_agent_builder` plugin when the
 * user is on a monitor details page. The two coexist with different
 * lifecycles and responsibilities.
 */
export const MONITOR_MANAGEMENT_ATTACHMENT_TYPE = 'synthetics.monitor_management' as const;

/**
 * SML (Searchable Machine-readable Library) type identifier for the
 * Synthetics monitor crawler. Used by the Agent Builder SML pipeline to
 * key chunks and attachments produced from monitor saved objects.
 */
export const MONITOR_SML_TYPE = 'synthetics_monitor' as const;
