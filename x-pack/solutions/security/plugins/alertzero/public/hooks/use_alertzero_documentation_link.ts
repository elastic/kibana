/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

/**
 * Documentation link for the header overflow (⋮) menu, shared by every AlertZero route's
 * header (`AppChromeLayout`'s own heading, and `WatchesSectionLayout`'s compact `AppHeader`).
 * Together with the globally registered feedback handler (rendered by the header itself as a
 * "Feedback" entry), this matches the prototype's overflow menu: Documentation + Give feedback.
 */
export const useAlertZeroDocumentationLink = (): string | undefined => {
  const { services } = useKibana<CoreStart>();
  return services.docLinks?.links.securitySolution.guide;
};
