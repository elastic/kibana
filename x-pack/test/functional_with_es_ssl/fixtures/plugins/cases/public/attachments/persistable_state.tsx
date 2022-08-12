/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  PersistableStateAttachmentType,
  PersistableStateAttachmentViewProps,
} from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { EuiButtonIcon } from '@elastic/eui';
import { EmbeddableComponentProps, TypedLensByValueInput } from '@kbn/lens-plugin/public';

const AttachmentActions: React.FC = () => {
  return (
    <EuiButtonIcon
      data-test-subj="test-attachment-action"
      onClick={() => {}}
      iconType="arrowRight"
      aria-label="See attachment"
    />
  );
};

const getLazyComponent = (
  EmbeddableComponent: React.ComponentType<EmbeddableComponentProps>
): React.LazyExoticComponent<React.FC<PersistableStateAttachmentViewProps>> =>
  React.lazy(() => {
    return Promise.resolve().then(() => {
      return {
        default: React.memo((props: PersistableStateAttachmentViewProps) => {
          const { persistableStateAttachmentState } = props;
          const attributes =
            persistableStateAttachmentState as unknown as TypedLensByValueInput['attributes'];

          return (
            <EmbeddableComponent
              id=""
              style={{ height: 200 }}
              timeRange={{ from: 'now-15m', to: 'now', mode: 'relative' }}
              attributes={attributes}
              renderMode="view"
              disableTriggers
              data-test-subj="lens-test"
            />
          );
        }),
      };
    });
  });

export const getPersistableStateAttachmentRegular = (
  EmbeddableComponent: React.ComponentType<EmbeddableComponentProps>
): PersistableStateAttachmentType => ({
  id: '.test',
  icon: 'casesApp',
  displayName: 'Test',
  getAttachmentViewObject: () => ({
    event: 'added an embeddable',
    timelineAvatar: 'casesApp',
    actions: <AttachmentActions />,
    children: getLazyComponent(EmbeddableComponent),
  }),
});
