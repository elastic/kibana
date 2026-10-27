/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';

/** Keeps registered attachment content behind a live access boundary. */
export const withAccessBoundary = <TAttachment extends UnknownAttachment>(
  definition: AttachmentUIDefinition<TAttachment>,
  AccessBoundary: React.ComponentType<React.PropsWithChildren>
): AttachmentUIDefinition<TAttachment> => {
  const { renderInlineContent } = definition;
  if (!renderInlineContent) return definition;

  const Content = ({
    args,
  }: {
    args: Parameters<NonNullable<AttachmentUIDefinition<TAttachment>['renderInlineContent']>>;
  }) => <>{renderInlineContent(...args)}</>;

  return {
    ...definition,
    renderInlineContent: (...args) => (
      <React.Suspense fallback={null}>
        <AccessBoundary>
          <Content args={args} />
        </AccessBoundary>
      </React.Suspense>
    ),
  };
};
