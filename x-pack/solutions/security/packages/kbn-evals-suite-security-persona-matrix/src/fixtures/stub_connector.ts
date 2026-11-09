/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Id the workflow-authoring prompts name as "the existing Slack connector".
 * The seed creates a local `.http` stub connector under exactly this id, so an
 * authored `http` step with `connector-id: <this id>` resolves on the stack
 * without any external host. WorkflowValidity runs only workflows whose
 * connector ids are in its allowlist, which defaults to this id.
 */
export const STUB_CONNECTOR_ID = 'd7306385-cbe6-4541-9726-49afdff59ba5';
