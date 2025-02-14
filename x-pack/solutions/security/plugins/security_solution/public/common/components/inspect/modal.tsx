/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiIconTip,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalFooter,
  EuiSpacer,
  EuiTabbedContent,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import type { ReactNode } from 'react';
import React, { useMemo, Fragment } from 'react';
import styled from '@emotion/styled';

import { useLocation } from 'react-router-dom';
import type { InputsModelId } from '../../store/inputs/constants';
import { NO_ALERT_INDEX } from '../../../../common/constants';
import * as i18n from './translations';
import { getScopeFromPath } from '../../../sourcerer/containers/sourcerer_paths';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { SourcererScopeName } from '../../../sourcerer/store/model';

export interface ModalInspectProps {
  adHocDataViews?: string[] | null;
  additionalRequests?: string[] | null;
  additionalResponses?: string[] | null;
  closeModal: () => void;
  inputId?: InputsModelId.global | InputsModelId.timeline;
  request: string;
  response: string;
  title: string | React.ReactElement | React.ReactNode;
}

interface Request {
  index: string[];
  allowNoIndices: boolean;
  ignoreUnavailable: boolean;
  body: Record<string, unknown>;
}

interface Response {
  took: number;
  timed_out: boolean;
  _shards: Record<string, unknown>;
  hits: Record<string, unknown>;
  aggregations: Record<string, unknown>;
}

const MyEuiModal = styled(EuiModal)`
  width: min(768px, calc(100vw - 16px));
  height: 41vh;

  .euiModal__flex {
    width: 60vw;
  }

  [role='tabpanel'] {
    /*
    * Current tabpanel height is based on the content inside it and since we are using virtualized codeblock,
    * which needs to have a fixed height of parent to render the codeblock properly, we will set tabpanel height
    * to take up any remaining space after header, footer and tabs in the Modal.
    *
    * height of the tabPanel is calculated according to the Modal height of 41vh
    * and then subtracting the height of the header, footer and the space between the tabs and the codeblock
    *
    * headerHeight + footerHeight + tabsHeight + paddingAroundCodeBlock = 208px
    *
    */
    height: calc(41vh - 208px) !important;
  }
`;

MyEuiModal.displayName = 'MyEuiModal';
const parseInspectStrings = function <T>(stringsArray: string[]): T[] {
  try {
    return stringsArray.map((objectStringify) => JSON.parse(objectStringify));
  } catch {
    return [];
  }
};

const manageStringify = (object: Record<string, unknown> | Response): string => {
  try {
    return JSON.stringify(object, null, 2);
  } catch {
    return i18n.SOMETHING_WENT_WRONG;
  }
};

export const formatIndexPatternRequested = (indices: string[] = []) => {
  if (indices.length === 1 && indices[0] === NO_ALERT_INDEX) {
    return <i>{i18n.NO_ALERT_INDEX_FOUND}</i>;
  }
  return indices.length > 0
    ? indices.filter((i) => i !== NO_ALERT_INDEX).join(', ')
    : i18n.SOMETHING_WENT_WRONG;
};

export const ModalInspectQuery = ({
  adHocDataViews,
  additionalRequests,
  additionalResponses,
  closeModal,
  inputId,
  request,
  response,
  title,
}: ModalInspectProps) => {
  const { pathname } = useLocation();
  const { selectedPatterns } = useSourcererDataView(
    inputId === 'timeline' ? SourcererScopeName.timeline : getScopeFromPath(pathname)
  );

  const requests: string[] = useMemo(
    () => [request, ...(additionalRequests != null ? additionalRequests : [])],
    [request, additionalRequests]
  );

  const responses: string[] = useMemo(
    () => [response, ...(additionalResponses != null ? additionalResponses : [])],
    [response, additionalResponses]
  );

  const inspectRequests: Request[] = useMemo(() => parseInspectStrings(requests), [requests]);
  const inspectResponses: Response[] = useMemo(() => parseInspectStrings(responses), [responses]);

  const isSourcererPattern = useMemo(
    () =>
      (inspectRequests[0]?.index ?? []).every((pattern) =>
        selectedPatterns.includes(pattern.trim())
      ),
    [inspectRequests, selectedPatterns]
  );

  const statistics: Array<{
    title: NonNullable<ReactNode | string>;
    description: NonNullable<ReactNode | string>;
  }> = useMemo(
    () => [
      {
        title: (
          <span data-test-subj="index-pattern-title">
            {i18n.INDEX_PATTERN}{' '}
            <EuiIconTip color="subdued" content={i18n.INDEX_PATTERN_DESC} type="iInCircle" />
          </span>
        ),
        description: (
          <span data-test-subj="index-pattern-description">
            <p>
              {formatIndexPatternRequested(
                adHocDataViews != null && adHocDataViews.length > 0
                  ? adHocDataViews
                  : inspectRequests[0]?.index ?? []
              )}
            </p>

            {!isSourcererPattern && (
              <p>
                <small>
                  <i data-test-subj="not-sourcerer-msg">{i18n.INSPECT_PATTERN_DIFFERENT}</i>
                </small>
              </p>
            )}
          </span>
        ),
      },

      {
        title: (
          <span data-test-subj="query-time-title">
            {i18n.QUERY_TIME}{' '}
            <EuiIconTip color="subdued" content={i18n.QUERY_TIME_DESC} type="iInCircle" />
          </span>
        ),
        description: (
          <span data-test-subj="query-time-description">
            {inspectResponses[0]?.took === 0
              ? '0ms'
              : inspectResponses[0]?.took
              ? `${numeral(inspectResponses[0].took).format('0,0')}ms`
              : i18n.SOMETHING_WENT_WRONG}
          </span>
        ),
      },
      {
        title: (
          <span data-test-subj="request-timestamp-title">
            {i18n.REQUEST_TIMESTAMP}{' '}
            <EuiIconTip color="subdued" content={i18n.REQUEST_TIMESTAMP_DESC} type="iInCircle" />
          </span>
        ),
        description: (
          <span data-test-subj="request-timestamp-description">{new Date().toISOString()}</span>
        ),
      },
    ],
    [adHocDataViews, inspectRequests, inspectResponses, isSourcererPattern]
  );

  const tabs = useMemo(
    () => [
      {
        id: 'statistics',
        name: 'Statistics',
        'data-test-subj': 'modal-inspect-statistics-tab',
        content: (
          <>
            <EuiSpacer />
            <EuiDescriptionList
              listItems={statistics}
              type="responsiveColumn"
              columnWidths={[3, 7]}
            />
          </>
        ),
      },
      {
        id: 'request',
        name: 'Request',
        'data-test-subj': 'modal-inspect-request-tab',
        content:
          inspectRequests.length > 0 ? (
            inspectRequests.map((inspectRequest, index) => (
              <Fragment key={index}>
                <EuiCodeBlock
                  data-test-subj="modal-inspect-request-preview"
                  language="json"
                  fontSize="m"
                  paddingSize="m"
                  color="dark"
                  overflowHeight="100%"
                  isCopyable
                  isVirtualized
                  lineNumbers
                >
                  {manageStringify(inspectRequest.body)}
                </EuiCodeBlock>
              </Fragment>
            ))
          ) : (
            <EuiCodeBlock>{i18n.SOMETHING_WENT_WRONG}</EuiCodeBlock>
          ),
      },
      {
        id: 'response',
        name: 'Response',
        'data-test-subj': 'modal-inspect-response-tab',
        content:
          inspectResponses.length > 0 ? (
            responses.map((responseText, index) => (
              <Fragment key={index}>
                <EuiCodeBlock
                  data-test-subj="modal-inspect-response-preview"
                  language="json"
                  fontSize="m"
                  paddingSize="m"
                  color="dark"
                  overflowHeight="100%"
                  isCopyable
                  isVirtualized
                  lineNumbers
                >
                  {responseText}
                </EuiCodeBlock>
              </Fragment>
            ))
          ) : (
            <EuiCodeBlock>{i18n.SOMETHING_WENT_WRONG}</EuiCodeBlock>
          ),
      },
    ],
    [inspectRequests, inspectResponses, responses, statistics]
  );

  return (
    <MyEuiModal onClose={closeModal} data-test-subj="modal-inspect-euiModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.INSPECT} {title}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton onClick={closeModal} fill data-test-subj="modal-inspect-close">
          {i18n.CLOSE}
        </EuiButton>
      </EuiModalFooter>
    </MyEuiModal>
  );
};
