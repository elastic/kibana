/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const BODY = i18n.translate('xpack.digitalExperience.mobile.unreadableData.body', {
  defaultMessage:
    "You can't read all of the mobile indices, so the data may be in the ones you can't. Ask an administrator for read access to them before instrumenting the application again.",
});

/** The empty state when nothing matched in the indices the user can read, but they can't read all. */
export function MobileUnreadableDataPrompt({
  title,
  'data-test-subj': dataTestSubj,
}: {
  title: string;
  'data-test-subj': string;
}) {
  return (
    <EuiEmptyPrompt
      data-test-subj={dataTestSubj}
      iconType="lock"
      title={<h2>{title}</h2>}
      body={<p>{BODY}</p>}
    />
  );
}
