/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import type { FC } from 'react';
import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { FlyoutTitle } from '../shared/components/flyout_title';
import { Timestamp } from '../shared/components/timestamp';
import { RawIndicatorFieldId } from '../../../common/threat_intelligence/types/indicator';
import { IOC_DETAILS_TITLE_TEST_ID, IOC_DETAILS_SUBTITLE_TEST_ID } from './test_ids';

export interface HeaderTitleProps {
  /**
   * The indicator document, as a Discover data table record
   */
  hit: DataTableRecord;
}

/**
 * Title and subtitle (first seen timestamp) of the indicator details flyout header.
 * Shared between the Security Solution flyout and the Discover IOC flyout integration
 * so the two surfaces present the same heading.
 */
export const HeaderTitle: FC<HeaderTitleProps> = memo(({ hit }) => (
  <>
    <FlyoutTitle
      title={i18n.translate('xpack.securitySolution.flyout.iocDetails.panelTitle', {
        defaultMessage: 'Indicator details',
      })}
      data-test-subj={IOC_DETAILS_TITLE_TEST_ID}
    />
    <EuiText size={'xs'}>
      <p data-test-subj={IOC_DETAILS_SUBTITLE_TEST_ID}>
        <FormattedMessage
          id="xpack.securitySolution.flyout.iocDetails.panelSubTitle"
          defaultMessage="First seen: "
        />
        <Timestamp hit={hit} field={RawIndicatorFieldId.FirstSeen} />
      </p>
    </EuiText>
  </>
));

HeaderTitle.displayName = 'HeaderTitle';
