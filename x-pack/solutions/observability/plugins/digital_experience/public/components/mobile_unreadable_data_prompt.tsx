/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const BODY = i18n.translate('xpack.digitalExperience.mobile.unreadableData.body', {
  defaultMessage:
    "You can't read all of the mobile indices, so the data may be in the ones you can't. Ask an administrator for read access to them before instrumenting the application again.",
});

const FILTERED_BODY = i18n.translate('xpack.digitalExperience.mobile.unreadableData.filteredBody', {
  defaultMessage:
    "Nothing matched the filters in the indices you can read. Change the filters, or, as you can't read all of the mobile indices, ask an administrator for read access to them.",
});

/**
 * The empty state when nothing matched in the indices the user can read, but they can't read all.
 * With filters set, either the filters or the access can be the cause, so it names both.
 */
export function MobileUnreadableDataPrompt({
  title,
  isFiltered,
  actions,
  'data-test-subj': dataTestSubj,
}: {
  title: string;
  isFiltered: boolean;
  /** E.g. a button that clears the filters. */
  actions?: ReactNode;
  'data-test-subj': string;
}) {
  return (
    <EuiEmptyPrompt
      data-test-subj={dataTestSubj}
      iconType="lock"
      title={<h2>{title}</h2>}
      body={<p>{isFiltered ? FILTERED_BODY : BODY}</p>}
      actions={actions}
    />
  );
}
