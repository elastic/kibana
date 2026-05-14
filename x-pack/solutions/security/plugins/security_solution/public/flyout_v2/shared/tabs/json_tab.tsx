/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useRef, useState } from 'react';
import { JsonCodeEditor } from '@kbn/unified-doc-viewer-plugin/public';
import { EuiButtonEmpty, EuiCopy, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { FlyoutError } from '../components/flyout_error';

export const JSON_TAB_CONTENT_TEST_ID = 'jsonView' as const;
export const JSON_TAB_COPY_TO_CLIPBOARD_BUTTON_TEST_ID = 'JsonTabCopyToClipboard' as const;

const FLYOUT_BODY_PADDING = 24;
const COPY_TO_CLIPBOARD_BUTTON_HEIGHT = 24;
const FLYOUT_FOOTER_HEIGHT = 72;

export interface JsonTabProps {
  /**
   * The data-test-subj to prefix the component one's
   */
  'data-test-subj': string;
  /**
   * Json value to render in the JsonCodeEditor
   */
  value: Record<string, unknown>;
  /**
   * When true, omits the footer height from the editor height calculation (use when there is no flyout footer).
   */
  showFooterOffset?: boolean;
  isEmpty?: boolean;
}

/** Renders a document as formatted JSON with a copy-to-clipboard button. Shows an error state when `isEmpty` is true. */
export const JsonTab = memo(
  ({
    value,
    'data-test-subj': dataTestSubj,
    isEmpty = false,
    showFooterOffset = false,
  }: JsonTabProps) => {
    const jsonValue = JSON.stringify(value, null, 2);
    const flexGroupElement = useRef<HTMLDivElement>(null);
    const [editorHeight, setEditorHeight] = useState<number>();

    useEffect(() => {
      const topPosition = flexGroupElement?.current?.getBoundingClientRect().top || 0;
      const footerOffset = showFooterOffset ? 0 : FLYOUT_FOOTER_HEIGHT;
      const height =
        window.innerHeight -
        topPosition -
        COPY_TO_CLIPBOARD_BUTTON_HEIGHT -
        FLYOUT_BODY_PADDING -
        footerOffset;

      if (height === 0) {
        return;
      }

      setEditorHeight(height);
    }, [showFooterOffset]);

    if (isEmpty) return <FlyoutError />;

    return (
      <EuiFlexGroup
        ref={flexGroupElement}
        direction="column"
        gutterSize="none"
        data-test-subj={`${dataTestSubj}${JSON_TAB_CONTENT_TEST_ID}`}
      >
        <EuiFlexItem>
          <EuiFlexGroup justifyContent={'flexEnd'}>
            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={jsonValue}>
                {(copy) => (
                  <EuiButtonEmpty
                    iconType={'copy'}
                    size={'xs'}
                    aria-label={i18n.translate(
                      'xpack.securitySolution.flyout.shared.jsonTab.copyToClipboardButtonAriaLabel',
                      {
                        defaultMessage: 'Copy to clipboard',
                      }
                    )}
                    data-test-subj={`${dataTestSubj}${JSON_TAB_COPY_TO_CLIPBOARD_BUTTON_TEST_ID}`}
                    onClick={copy}
                    onKeyDown={copy}
                  >
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.shared.jsonTab.copyToClipboardButtonLabel"
                      defaultMessage="Copy to clipboard"
                    />
                  </EuiButtonEmpty>
                )}
              </EuiCopy>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <JsonCodeEditor
            json={value}
            height={editorHeight}
            hasLineNumbers={true}
            enableFindAction={true}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

JsonTab.displayName = 'JsonTab';
