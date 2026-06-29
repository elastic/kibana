/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Forward-ref stub: the workflow execution details flyout (and its diagnostic
// report helpers) is implemented by the Skills PR (PR8). This PR (PR7) only
// references the `SourceMetadata` type from the loading callout, so just that
// type is declared here. FF-off safe: the flyout is only rendered on the
// feature-flag-gated monitoring path.
export interface SourceMetadata {
  action_execution_uuid?: string;
  rule_id?: string;
  rule_name?: string;
}
