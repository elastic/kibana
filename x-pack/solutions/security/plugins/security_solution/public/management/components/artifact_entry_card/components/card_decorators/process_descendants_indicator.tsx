/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import React, { memo } from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import { isProcessDescendantsEnabled } from '../../../../../../common/endpoint/service/artifacts/utils';
import { ProcessDescendantsIconTip } from '../../../process_descendant_icontip';
import type { ArtifactEntryCardDecoratorProps } from '../../artifact_entry_card';
import { TRUSTED_PROCESS_DESCENDANTS_TAG } from '../../../../../../common/endpoint/service/artifacts';

export const ProcessDescendantsIndicator = memo<ArtifactEntryCardDecoratorProps>(
  ({ item, 'data-test-subj': dataTestSubj, labels, ...commonProps }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isEventFiltersProcessDescendantsEnabled = isProcessDescendantsEnabled(
      item as ExceptionListItemSchema
    );
    const isTrustedAppsProcessDescendantsEnabled = isProcessDescendantsEnabled(
      item as ExceptionListItemSchema,
      TRUSTED_PROCESS_DESCENDANTS_TAG
    );

    if (labels && (isEventFiltersProcessDescendantsEnabled || isTrustedAppsProcessDescendantsEnabled)) {
      return (
        <>
          <EuiText {...commonProps} data-test-subj={getTestId('processDescendantsIndication')}>
            <code>
              <strong>
              {labels.title}
              {' '}
                  <ProcessDescendantsIconTip
                    tooltipText={labels.tooltipText}
                    versionInfo={labels.versionInfo}
                    indicateExtraEntry
                    data-test-subj={getTestId('processDescendantsIndicationTooltip')}
                  />
              </strong>
            </code>
          </EuiText>
          <EuiSpacer size="m" />
        </>
      );
    }

    return <></>;
  }
);
ProcessDescendantsIndicator.displayName = 'ProcessDescendantsIndicator';
