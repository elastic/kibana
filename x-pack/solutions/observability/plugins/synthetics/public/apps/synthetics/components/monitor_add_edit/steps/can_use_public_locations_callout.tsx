/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const CanUsePublicLocationsCallout = ({
  canUsePublicLocations,
}: {
  canUsePublicLocations?: boolean;
}) => {
  if (!canUsePublicLocations) {
    return (
      <>
        <EuiCallOut
          color="warning"
          title={
            <FormattedMessage
              id="xpack.synthetics.publicLocations.readOnly.callout.title"
              defaultMessage="You do not have permission to use Elastic managed locations"
            />
          }
          iconType="alert"
        >
          <p>
            <FormattedMessage
              id="xpack.synthetics.publicLocations.readOnly.callout.content"
              defaultMessage="This monitor contains a Elastic managed location. To edit this monitor, you need to have permission to use Elastic managed locations."
            />
          </p>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    );
  }

  return null;
};
