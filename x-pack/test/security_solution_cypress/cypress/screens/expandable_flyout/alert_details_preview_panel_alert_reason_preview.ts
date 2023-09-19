/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_REASON_PREVIEW_BODY_TEST_ID } from '@kbn/security-solution-plugin/public/flyout/preview/components/test_ids';
import { getDataTestSubjectSelector } from '../../helpers/common';

export const DOCUMENT_DETAILS_FLYOUT_ALERT_REASON_PREVIEW_CONTAINER = getDataTestSubjectSelector(
  ALERT_REASON_PREVIEW_BODY_TEST_ID
);
