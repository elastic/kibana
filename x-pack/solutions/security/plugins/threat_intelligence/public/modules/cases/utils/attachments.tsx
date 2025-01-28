/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import { AttachmentType, ExternalReferenceStorageType } from '@kbn/cases-plugin/common';
import { JsonValue } from '@kbn/utility-types';
import { ExternalReferenceAttachmentType } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import React from 'react';
import { EuiAvatar } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CASE_ATTACHMENT_TYPE_ID } from '../../../../common/constants';
import { EMPTY_VALUE } from '../../../constants/common';
import { Indicator, RawIndicatorFieldId } from '../../../../common/types/indicator';
import { getIndicatorFieldAndValue } from '../../indicators/utils/field_value';

/**
 * Indicator name, type, feed name and first seen values,
 * rendered in the comment section of a case's attachment or in the flyout
 */
export interface AttachmentMetadata {
  indicatorName: string;
  indicatorType: string;
  indicatorFeedName: string;
}

const AttachmentChildrenLazy = React.lazy(() => import('../components/attachment_children'));

/**
 * Create an {@link ExternalReferenceAttachmentType} object used to register an external reference
 * to the case plugin with our Threat Intelligence plugin initializes.
 *
 * See documentation here https://docs.elastic.dev/reops/attachment-framework-external-reference
 *
 * This object drives for example:
 * - the icon displayed in the case attachment
 * - the component that renders the comment in teh case attachment
 */
export const generateAttachmentType = (): ExternalReferenceAttachmentType => ({
  id: CASE_ATTACHMENT_TYPE_ID,
  displayName: 'indicator',
  getAttachmentViewObject: () => ({
    event: (
      <FormattedMessage
        id="xpack.threatIntelligence.cases.eventDescription"
        defaultMessage="added an indicator of compromise"
      />
    ),
    timelineAvatar: <EuiAvatar name="indicator" color="subdued" iconType="crosshairs" />,
    children: AttachmentChildrenLazy,
  }),
  icon: 'crosshairs',
});

/**
 * Creates an attachment object, then passed to a case. It contains all the information necessary (id and metadata)
 * to allow the lazy loaded component defined within {@link generateAttachmentType} to render.
 *
 * See documentation here https://docs.elastic.dev/reops/attachment-framework-external-reference
 *
 * @param externalReferenceId the id saved in the case's attachment (in our case the indicator id)
 * @param attachmentMetadata some metadata also saved in the case's attachments for display in the comment
 */
export const generateAttachmentsWithoutOwner = (
  externalReferenceId: string,
  attachmentMetadata: AttachmentMetadata
): CaseAttachmentsWithoutOwner => {
  if (!externalReferenceId) {
    return [];
  }

  return [
    {
      type: AttachmentType.externalReference,
      externalReferenceId,
      externalReferenceStorage: {
        type: ExternalReferenceStorageType.elasticSearchDoc,
      },
      externalReferenceAttachmentTypeId: CASE_ATTACHMENT_TYPE_ID,
      externalReferenceMetadata: attachmentMetadata as unknown as { [p: string]: JsonValue },
    },
  ];
};

/**
 * To facilitate the rendering of the lazy loaded component defined in {@link generateAttachmentType}, we pass
 * some of the indicator's fields to be saved in the case's attachment.
 *
 * @param indicator the indicator we're attaching to a case
 */
export const generateAttachmentsMetadata = (indicator: Indicator): AttachmentMetadata => {
  const indicatorName: string | null = getIndicatorFieldAndValue(
    indicator,
    RawIndicatorFieldId.Name
  ).value;
  const indicatorType: string | null = getIndicatorFieldAndValue(
    indicator,
    RawIndicatorFieldId.Type
  ).value;
  const indicatorFeedName: string | null = getIndicatorFieldAndValue(
    indicator,
    RawIndicatorFieldId.Feed
  ).value;

  return {
    indicatorName: indicatorName || EMPTY_VALUE,
    indicatorType: indicatorType || EMPTY_VALUE,
    indicatorFeedName: indicatorFeedName || EMPTY_VALUE,
  };
};
