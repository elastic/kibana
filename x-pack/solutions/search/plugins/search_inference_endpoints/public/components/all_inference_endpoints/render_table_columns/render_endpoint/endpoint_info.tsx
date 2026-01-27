/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, EuiButtonIcon, EuiCopy, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { isEndpointPreconfigured } from '../../../../utils/preconfigured_endpoint_helper';
import * as i18n from './translations';
import { isProviderTechPreview } from '../../../../utils/reranker_helper';

const COPIED_ICON_DISPLAY_DURATION_MS = 2000;

export interface EndpointInfoProps {
  inferenceId: string;
  endpointInfo: InferenceInferenceEndpointInfo;
  isCloudEnabled?: boolean;
}

export const EndpointInfo: React.FC<EndpointInfoProps> = ({
  inferenceId,
  endpointInfo,
  isCloudEnabled,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback((copyFn: () => void) => {
    copyFn();
    setIsCopied(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsCopied(false);
    }, COPIED_ICON_DISPLAY_DURATION_MS);
  }, []);

  const copyButtonStyles = css`
    opacity: ${isCopied ? 1 : 0};
    transition: opacity 150ms ease-in-out;

    &:focus {
      opacity: 1;
    }
  `;

  const containerStyles = css`
    &:hover .copyButton {
      opacity: 1;
    }
  `;

  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              gutterSize="xs"
              alignItems="center"
              responsive={false}
              css={containerStyles}
            >
              <EuiFlexItem grow={false}>
                <span>
                  <strong>{inferenceId}</strong>
                </span>
              </EuiFlexItem>
              <EuiFlexItem grow={false} className="copyButton" css={copyButtonStyles}>
                <EuiCopy textToCopy={inferenceId} afterMessage={i18n.COPY_ID_COPIED}>
                  {(copy) => (
                    <EuiButtonIcon
                      size="xs"
                      display="empty"
                      onClick={() => handleCopy(copy)}
                      iconType={isCopied ? 'check' : 'copy'}
                      color={isCopied ? 'success' : 'text'}
                      data-test-subj={
                        isCopied
                          ? 'inference-endpoint-copy-id-button-copied'
                          : 'inference-endpoint-copy-id-button'
                      }
                      aria-label={isCopied ? i18n.COPY_ID_COPIED : i18n.COPY_ID_TO_CLIPBOARD}
                    />
                  )}
                </EuiCopy>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {isProviderTechPreview(endpointInfo) ? (
            <EuiFlexItem grow={false}>
              <span>
                <EuiBetaBadge
                  label={i18n.TECH_PREVIEW_LABEL}
                  size="s"
                  color="subdued"
                  alignment="middle"
                />
              </span>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
      {isEndpointPreconfigured(inferenceId) ? (
        <EuiFlexItem grow={false}>
          <span>
            <EuiBetaBadge
              label={i18n.PRECONFIGURED_LABEL}
              size="s"
              color="hollow"
              alignment="middle"
            />
          </span>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
