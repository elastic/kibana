/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RoutingDefinition } from '@kbn/streams-schema';

export const ChildrenAffectedCallout = ({
  childStreams,
}: {
  childStreams: RoutingDefinition[];
}) => {
  return (
    <EuiCallOut
      color="warning"
      title={i18n.translate('xpack.streams.childStreamsWarning.title', {
        defaultMessage: 'Field changes',
      })}
    >
      {i18n.translate('xpack.streams.childStreamsWarning.text', {
        defaultMessage: "Editing this field will affect it's dependant streams: {affectedStreams} ",
        values: {
          affectedStreams: childStreams.map((stream) => stream.destination).join(', '),
        },
      })}
    </EuiCallOut>
  );
};
