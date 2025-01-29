/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { RoutingDefinition } from '@kbn/streams-schema';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';

export const ChildrenAffectedCallout = ({
  childStreams,
}: {
  childStreams: RoutingDefinition[];
}) => {
  const router = useStreamsAppRouter();
  const childStreamLinks = childStreams.map((stream) => {
    return (
      <EuiLink
        data-test-subj="streamsAppChildStreamLinksLink"
        href={router.link('/{key}', { path: { key: stream.destination } })}
      >
        {stream.destination}
      </EuiLink>
    );
  });
  return (
    <EuiCallOut
      color="warning"
      title={i18n.translate('xpack.streams.childStreamsWarning.title', {
        defaultMessage: 'Field changes',
      })}
    >
      <FormattedMessage
        id="xpack.streams.childStreamsWarning.text"
        defaultMessage="Editing this field will affect it's dependant streams: {affectedStreams}"
        values={{
          affectedStreams: childStreamLinks.map((link, i) => [i > 0 && ', ', link]),
        }}
      />
    </EuiCallOut>
  );
};
