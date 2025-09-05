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

export const JSON_TAB_CONTENT_TEST_ID = 'jsonView' as const;
export const JSON_TAB_COPY_TO_CLIPBOARD_BUTTON_TEST_ID = `JsonTabCopyToClipboard` as const;

// import { useDocumentDetailsContext } from './context';

const FLYOUT_BODY_PADDING = 24;
const COPY_TO_CLIPBOARD_BUTTON_HEIGHT = 24;
const FLYOUT_FOOTER_HEIGHT = 72;

export interface JsonTabProps {
  /**
   * The data-test-subj to prefix the component one's
   */
  ['data-test-subj']?: string;
  /**
   * Use to influence the height of the JsonCodeEditor (in some place the flyout does not have a footer).
   */
  showFooterOffset: boolean;
  /**
   * Json value to render in the JsonCodeEditor
   */
  value: Record<string, unknown>;
}

/**
 * Json view displayed in the document details expandable flyout right section and in the indicator flyout.
 */
export const JsonTab = memo(
  ({ value, showFooterOffset, 'data-test-subj': dataTestSubj }: JsonTabProps) => {
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
    }, [setEditorHeight, showFooterOffset]);

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
                    iconType={'copyClipboard'}
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
          <JsonCodeEditor json={value} height={editorHeight} hasLineNumbers={true} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

JsonTab.displayName = 'JsonTab';
