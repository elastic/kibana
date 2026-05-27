/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import type { FC, ReactNode } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { getRowRenderer } from '../../../../timelines/components/timeline/body/renderers/get_row_renderer';
import { defaultRowRenderers } from '../../../../timelines/components/timeline/body/renderers';
import { useEventDetails } from '../../../../flyout/document_details/shared/hooks/use_event_details';
import { FlyoutError } from '../../../shared/components/flyout_error';
import { EventKind } from '../constants/event_kinds';
import {
  REASON_DETAILS_LEGACY_BODY_TEST_ID,
  REASON_DETAILS_POPOVER_TEST_ID,
  REASON_DETAILS_PREVIEW_BUTTON_TEST_ID,
  REASON_DETAILS_TEST_ID,
  REASON_TITLE_TEST_ID,
} from './test_ids';

const SCOPE_ID = 'document-details-flyout';

/**
 * Displays the information provided by the rowRenderer. Supports multiple types of documents.
 */
export interface AlertReasonProps {
  /**
   * Alert/event document
   */
  hit: DataTableRecord;
}

export const AlertReason: FC<AlertReasonProps> = ({ hit }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const isAlert = useMemo(
    () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
    [hit]
  );
  const reason = useMemo(() => getFieldValue(hit, 'kibana.alert.reason') as string, [hit]);

  const togglePopover = useCallback(() => setIsPopoverOpen((currentValue) => !currentValue), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const viewPreview = useMemo(() => {
    const button = (
      <EuiButtonEmpty
        size="s"
        iconType="arrowDown"
        onClick={togglePopover}
        iconSide="right"
        data-test-subj={REASON_DETAILS_PREVIEW_BUTTON_TEST_ID}
        aria-label={i18n.translate(
          'xpack.securitySolution.flyout.document.about.reason.alertReasonButtonAriaLabel',
          {
            defaultMessage: 'Show full reason',
          }
        )}
        disabled={!reason}
      >
        <FormattedMessage
          id="xpack.securitySolution.flyout.document.about.reason.alertReasonButtonLabel"
          defaultMessage="Show full reason"
        />
      </EuiButtonEmpty>
    );

    return (
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={button}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          anchorPosition="downRight"
          panelPaddingSize="s"
          aria-label={i18n.translate(
            'xpack.securitySolution.flyout.document.about.reason.alertReasonPopoverAriaLabel',
            {
              defaultMessage: 'Full alert reason',
            }
          )}
        >
          {isPopoverOpen ? <AlertReasonPopoverContent hit={hit} /> : null}
        </EuiPopover>
      </EuiFlexItem>
    );
  }, [closePopover, hit, isPopoverOpen, reason, togglePopover]);

  const alertReasonText = reason ? (
    reason
  ) : (
    <FormattedMessage
      id="xpack.securitySolution.flyout.document.about.reason.noReasonDescription"
      defaultMessage="There's no source event information for this alert."
    />
  );

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem data-test-subj={REASON_TITLE_TEST_ID}>
          <EuiTitle size="xxs">
            <h5>
              {isAlert ? (
                <EuiFlexGroup
                  justifyContent="spaceBetween"
                  alignItems="center"
                  gutterSize="none"
                  responsive={false}
                >
                  <EuiFlexItem grow={false}>
                    <h5>
                      <FormattedMessage
                        id="xpack.securitySolution.flyout.document.about.reason.alertReasonTitle"
                        defaultMessage="Alert reason"
                      />
                    </h5>
                  </EuiFlexItem>
                  {viewPreview}
                </EuiFlexGroup>
              ) : (
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.document.about.reason.documentReasonTitle"
                    defaultMessage="Document reason"
                  />
                </p>
              )}
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem data-test-subj={REASON_DETAILS_TEST_ID}>
          {isAlert ? alertReasonText : '-'}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

interface AlertReasonPopoverContentProps {
  hit: DataTableRecord;
}

const AlertReasonPopoverContent: FC<AlertReasonPopoverContentProps> = ({ hit }) => {
  const { dataAsNestedObject, loading } = useEventDetails({
    eventId: hit.raw._id,
    indexName: hit.raw._index,
  });

  const renderer = useMemo(
    () =>
      dataAsNestedObject
        ? getRowRenderer({ data: dataAsNestedObject, rowRenderers: defaultRowRenderers })
        : null,
    [dataAsNestedObject]
  );

  const rowRenderer = useMemo(
    () =>
      renderer && dataAsNestedObject
        ? renderer.renderRow({
            data: dataAsNestedObject,
            scopeId: SCOPE_ID,
          })
        : null,
    [renderer, dataAsNestedObject]
  );

  if (loading) {
    return (
      <AlertReasonPopoverPanel>
        <EuiSkeletonText lines={3} />
      </AlertReasonPopoverPanel>
    );
  }

  if (!renderer || !rowRenderer) {
    return (
      <AlertReasonPopoverPanel>
        <FlyoutError />
      </AlertReasonPopoverPanel>
    );
  }

  return (
    <AlertReasonPopoverPanel>
      <div className="eui-displayInlineBlock">{rowRenderer}</div>
    </AlertReasonPopoverPanel>
  );
};

const AlertReasonPopoverPanel: FC<{ children: ReactNode }> = ({ children }) => (
  <EuiPanel
    color="subdued"
    className="eui-xScroll"
    data-test-subj={REASON_DETAILS_POPOVER_TEST_ID}
    css={css`
      width: min(600px, 80vw);
    `}
  >
    <div data-test-subj={REASON_DETAILS_LEGACY_BODY_TEST_ID}>
      <EuiTitle size="xxxs">
        <h6>
          <FormattedMessage
            id="xpack.securitySolution.flyout.document.about.reason.alertReasonTitle"
            defaultMessage="Alert reason"
          />
        </h6>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="xs">{children}</EuiText>
    </div>
  </EuiPanel>
);

AlertReasonPopoverContent.displayName = 'AlertReasonPopoverContent';
AlertReasonPopoverPanel.displayName = 'AlertReasonPopoverPanel';
AlertReason.displayName = 'AlertReason';
