/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowConfiguration } from '../../types';

/**
 * Returns true when at least one of the three composite retrieval toggles
 * (skill, default retrieval, alert retrieval workflows) is enabled.
 *
 * The composite configuration is invalid unless at least one retrieval method
 * is enabled; this is the form-side mirror of the schema/route-layer
 * `hasAtLeastOneRetrievalToggle` rule in `@kbn/discoveries-schemas`.
 */
export const hasAtLeastOneRetrievalToggle = ({
  alertRetrievalWorkflowsEnabled,
  defaultRetrievalEnabled,
  skillEnabled,
}: WorkflowConfiguration): boolean =>
  skillEnabled || defaultRetrievalEnabled || alertRetrievalWorkflowsEnabled;
