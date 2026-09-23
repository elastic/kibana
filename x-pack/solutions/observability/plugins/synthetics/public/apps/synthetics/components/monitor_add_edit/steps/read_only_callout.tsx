/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFormContext } from 'react-hook-form';
import { ConfigKey } from '../types';

export const ReadOnlyCallout = ({ projectId }: { projectId?: string }) => {
  const { formState } = useFormContext();
  const locked = Boolean(formState.defaultValues?.[ConfigKey.LOCKED]);

  if (projectId) {
    return (
      <>
        <KbnInfoCallout
          announceOnMount
          title={
            <FormattedMessage
              id="xpack.synthetics.project.readOnly.callout.title"
              defaultMessage="This configuration is read-only"
            />
          }
          text={
            locked ? (
              <FormattedMessage
                id="xpack.synthetics.project.readOnly.lockedCallout.content"
                defaultMessage="This monitor was added from an external project: {projectId}. It is locked, so you cannot enable, disable, or change alerts here. To make changes, edit its source file and push it again from that project. You can still delete it."
                values={{ projectId: <strong>{projectId}</strong> }}
              />
            ) : (
              <FormattedMessage
                id="xpack.synthetics.project.readOnly.callout.content"
                defaultMessage="This monitor was added from an external project: {projectId}. From this page, you can only enable and disable the monitor and its alerts, or remove it. To make configuration changes, you have to edit its source file and push it again from that project."
                values={{ projectId: <strong>{projectId}</strong> }}
              />
            )
          }
        />
        <EuiSpacer size="m" />
      </>
    );
  }

  return null;
};
