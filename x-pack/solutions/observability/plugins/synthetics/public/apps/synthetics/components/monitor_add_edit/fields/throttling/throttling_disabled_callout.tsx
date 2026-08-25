/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const ThrottlingDisabledCallout = () => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.synthetics.createPackagePolicy.stepConfigure.browserAdvancedSettings.throttling.automatic_node_cap.title"
            defaultMessage="Automatic cap"
          />
        }
        color="warning"
        iconType="warning"
      >
        <FormattedMessage
          id="xpack.synthetics.createPackagePolicy.stepConfigure.browserAdvancedSettings.throttling.automatic_node_cap.message"
          defaultMessage="When disabling throttling, your monitor will still have its bandwidth capped by the configurations of the Synthetics Nodes in which it's running."
        />
      </EuiCallOut>
    </>
  );
};
