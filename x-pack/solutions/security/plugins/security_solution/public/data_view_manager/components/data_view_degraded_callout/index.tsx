/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, type ReactNode } from 'react';
import { EuiCode } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { DataView } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export interface DataViewDegradedCalloutProps {
  /** Data view whose field-caps request matched no indices. */
  dataView: DataView;
  /**
   * Surface-specific follow-up shown after the shared "matched no indices" sentence.
   * Callers must pass an i18n string (typically a FormattedMessage).
   */
  children: ReactNode;
  /**
   * When true, omits the index pattern list and uses a smaller callout.
   * Use in narrow layouts such as the document flyout.
   */
  compact?: boolean;
  /** Test subject unique to the call site. */
  'data-test-subj': string;
}

const TITLE = i18n.translate(
  'xpack.securitySolution.dataViewManager.dataViewDegradedCallout.unavailableFieldsTitle',
  {
    defaultMessage: 'Some data view fields are unavailable',
  }
);

/**
 * Warns that a data view loaded without matched indices so field metadata may be incomplete.
 */
export const DataViewDegradedCallout = memo(
  ({
    dataView,
    children,
    compact = false,
    'data-test-subj': dataTestSubj,
  }: DataViewDegradedCalloutProps) => (
    <KbnWarningCallout
      announceOnMount
      size={compact ? 's' : 'm'}
      title={TITLE}
      data-test-subj={dataTestSubj}
    >
      {compact ? (
        children
      ) : (
        <FormattedMessage
          id="xpack.securitySolution.dataViewManager.dataViewDegradedCallout.noMatchedIndicesDescription"
          defaultMessage="Index pattern {indexPattern} matched no indices. {details}"
          values={{
            indexPattern: <EuiCode>{dataView.getIndexPattern()}</EuiCode>,
            details: children,
          }}
        />
      )}
    </KbnWarningCallout>
  )
);

DataViewDegradedCallout.displayName = 'DataViewDegradedCallout';
