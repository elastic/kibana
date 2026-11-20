/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface BackToAddDataProps {
  onClick: () => void;
}

/** The way back to the home from a page that is shown without the Kibana chrome. */
export const BackToAddData = ({ onClick }: BackToAddDataProps): React.JSX.Element => (
  <EuiButtonEmpty
    iconType="chevronSingleLeft"
    flush="left"
    size="s"
    data-test-subj="searchHomepageBackToAddData"
    onClick={onClick}
  >
    {i18n.translate('xpack.searchHomepage.ingestGate.backToAddData', {
      defaultMessage: 'Back to add data',
    })}
  </EuiButtonEmpty>
);
