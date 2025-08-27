/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PRODUCT_DOCUMENTATION_TOOL } from './product_docs/product_documentation_tool';
import { GENERATE_ESQL_TOOL } from './esql/generate_esql_tool';
import { ASK_ABOUT_ESQL_TOOL } from './esql/ask_about_esql_tool';
import { GENERATE_ASSET_ESQL_TOOL } from './esql/generate_asset_esql_tool';
import { ALERT_COUNTS_TOOL } from './alert_counts/alert_counts_tool';
import { OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL } from './open_and_acknowledged_alerts/open_and_acknowledged_alerts_tool';
import { KNOWLEDGE_BASE_RETRIEVAL_TOOL } from './knowledge_base/knowledge_base_retrieval_tool';
import { KNOWLEDGE_BASE_WRITE_TOOL } from './knowledge_base/knowledge_base_write_tool';
import { SECURITY_LABS_KNOWLEDGE_BASE_TOOL } from './security_labs/security_labs_tool';
import { ASSET_INVENTORY_TOOL } from './asset_inventory_simple/asset_inventory_simple';
import { ASSET_COMPLIANCE_TOOL } from './asset_compliance_tool/asset_compliance_tool';

// any new tool should also be added to telemetry schema in
// x-pack/solutions/security/plugins/elastic_assistant/server/lib/telemetry/event_based_telemetry.ts
export const assistantTools = [
  ALERT_COUNTS_TOOL,
  ASSET_INVENTORY_TOOL,
  ASSET_COMPLIANCE_TOOL,
  KNOWLEDGE_BASE_RETRIEVAL_TOOL,
  KNOWLEDGE_BASE_WRITE_TOOL,
  GENERATE_ESQL_TOOL,
  ASK_ABOUT_ESQL_TOOL,
  GENERATE_ASSET_ESQL_TOOL,
  OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL,
  PRODUCT_DOCUMENTATION_TOOL,
  SECURITY_LABS_KNOWLEDGE_BASE_TOOL,
];
