/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

/** The AlertZero pages that have their own documentation, keyed by `docLinks.links.securitySolution.alertZero`. */
export type AlertZeroDocumentationPage =
  | 'overview'
  | 'setUp'
  | 'proposedActions'
  | 'escalations'
  | 'watches';

/** Documentation link for the header overflow menu; the header renders the Feedback entry itself. */
export const useAlertZeroDocumentationLink = (
  page: AlertZeroDocumentationPage
): string | undefined => {
  const { services } = useKibana<CoreStart>();
  return services.docLinks?.links.securitySolution.alertZero[page];
};
