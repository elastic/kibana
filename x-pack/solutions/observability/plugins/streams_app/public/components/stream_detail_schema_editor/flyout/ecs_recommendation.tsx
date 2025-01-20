/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../hooks/use_kibana';

const EcsRecommendationText = i18n.translate(
  'xpack.streams.streamDetailSchemaEditor.ecsRecommendationText',
  {
    defaultMessage: 'ECS recommendation',
  }
);

const UknownEcsFieldText = i18n.translate(
  'xpack.streams.streamDetailSchemaEditor.uknownEcsFieldText',
  {
    defaultMessage: 'Not an ECS field',
  }
);

const LoadingText = i18n.translate(
  'xpack.streams.streamDetailSchemaEditor.ecsRecommendationLoadingText',
  {
    defaultMessage: 'Loading...',
  }
);

export const EcsRecommendation = ({ field }: { field: string }) => {
  const {
    dependencies: {
      start: {
        fieldsMetadata: { useFieldsMetadata },
      },
    },
  } = useKibana();

  const { fieldsMetadata, loading } = useFieldsMetadata({
    attributes: ['type'],
    fieldNames: [field],
  });

  return (
    <EuiText size="xs">
      {`${EcsRecommendationText}: `}
      {loading
        ? LoadingText
        : fieldsMetadata?.[field]?.type !== undefined
        ? fieldsMetadata?.[field]?.type
        : UknownEcsFieldText}
    </EuiText>
  );
};
