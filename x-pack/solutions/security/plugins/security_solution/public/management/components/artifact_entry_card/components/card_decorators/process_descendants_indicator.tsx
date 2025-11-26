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

export interface CardDecoratorLabels {
  title: string;
  tooltipText: string;
  versionInfo: string;
}

export interface ProcessDescendantsIndicatorProps extends ArtifactEntryCardDecoratorProps {
  labels: CardDecoratorLabels;
  processDescendantsTag: string;
}

export const ProcessDescendantsIndicator = memo<ProcessDescendantsIndicatorProps>(
  ({ item, 'data-test-subj': dataTestSubj, labels, processDescendantsTag, ...commonProps }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    if (isProcessDescendantsEnabled(item as ExceptionListItemSchema, processDescendantsTag)) {
      return (
        <>
          <EuiText {...commonProps} data-test-subj={getTestId('processDescendantsIndication')}>
            <code>
              <strong>
                {labels.title}{' '}
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
