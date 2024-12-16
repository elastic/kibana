/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnnotationDomainType, LineAnnotation } from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { AlertEventResponse } from '@kbn/investigation-shared';
import moment from 'moment';
import React from 'react';

export const AlertEvent = ({ event }: { event: AlertEventResponse }) => {
  return (
    <LineAnnotation
      id={event.id}
      domainType={AnnotationDomainType.XDomain}
      marker={
        <span>
          <EuiIcon style={{ marginTop: -16 }} type="dot" size="l" color="danger" />
        </span>
      }
      markerPosition="bottom"
      dataValues={[
        {
          dataValue: moment(event.timestamp).valueOf(),
          header: moment(event.timestamp).format('lll'),
          details: event.description,
        },
      ]}
    />
  );
};
