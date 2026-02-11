/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiIconTip,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { useFormatBytes } from '../../../../../../common/components/formatted_bytes';
import type { EndpointScript } from '../../../../../../../common/endpoint/types';
import { EndpointScriptDetailItem } from './script_detail_item';
import { SCRIPT_LIBRARY_LABELS as labels } from '../../../translations';
import { ScriptTags } from '../script_tags';

const i18nFlyoutDetailsLabels = labels.flyout.body.details;
type KeyType = keyof typeof i18nFlyoutDetailsLabels;
interface EndpointScriptDetailsFlyoutBodyProps {
  scriptItem?: EndpointScript;
  'data-test-subj'?: string;
}
export const EndpointScriptDetailsFlyoutBody = memo<EndpointScriptDetailsFlyoutBodyProps>(
  ({ scriptItem, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const formatBytes = useFormatBytes();
    const orderedScriptDetails: Record<KeyType, boolean | string | number | string[]> | null =
      useMemo(() => {
        if (!scriptItem) {
          return null;
        }
        return Object.assign(
          {},
          ...Object.keys(i18nFlyoutDetailsLabels).map((key) => ({
            [key]: scriptItem[key as keyof typeof scriptItem],
          }))
        );
      }, [scriptItem]);

    const renderScriptDetails = useCallback(
      (key: KeyType, value: boolean | string | number | string[]): React.JSX.Element => {
        if (key === 'requiresInput') {
          return (
            <EuiText size="s">
              {value ? (
                <FormattedMessage
                  id="xpack.securitySolution.script.details.requiresInputYes"
                  defaultMessage="Yes"
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.script.details.requiresInputNo"
                  defaultMessage="No"
                />
              )}
            </EuiText>
          );
        }

        if (key === 'tags' && Array.isArray(value)) {
          return <ScriptTags tags={value} data-test-subj="scriptTags" />;
        }

        if (key === 'fileSize') {
          return <EuiText size="s">{formatBytes(value as number).toLowerCase()}</EuiText>;
        }

        if (key === 'fileHash') {
          return (
            <EuiCodeBlock fontSize="m" paddingSize="l" isCopyable className="eui-textBreakWord">
              {String(value)}
            </EuiCodeBlock>
          );
        }

        return <EuiText size="s">{String(value)}</EuiText>;
      },
      [formatBytes]
    );

    return (
      <EuiFlyoutBody data-test-subj={getTestId()}>
        <EuiFlexGroup direction="column" gutterSize="m">
          {Object.entries(orderedScriptDetails ?? {}).map(([key, value]) => {
            const label = i18nFlyoutDetailsLabels[key as KeyType].label;
            const appendToLabel =
              key === 'requiresInput' ? (
                <EuiIconTip content={i18nFlyoutDetailsLabels.requiresInput.tooltip} type="info" />
              ) : undefined;
            if (value === '' || value == null || (Array.isArray(value) && value.length === 0)) {
              return null;
            }
            return (
              label && (
                <EuiFlexItem key={key} data-test-subj={getTestId(`detail-${key}`)}>
                  <EndpointScriptDetailItem label={label} appendToLabel={appendToLabel} key={key}>
                    {renderScriptDetails(key as KeyType, value)}
                  </EndpointScriptDetailItem>
                  <EuiSpacer size="s" />
                </EuiFlexItem>
              )
            );
          })}
        </EuiFlexGroup>
      </EuiFlyoutBody>
    );
  }
);

EndpointScriptDetailsFlyoutBody.displayName = 'EndpointScriptDetailsFlyoutBody';
