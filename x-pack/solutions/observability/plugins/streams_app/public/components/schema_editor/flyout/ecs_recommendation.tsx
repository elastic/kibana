/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

const EcsRecommendationText = i18n.translate(
  'xpack.streams.streamDetailSchemaEditor.ecsRecommendationText',
  { defaultMessage: 'ECS recommendation' }
);

const UknownEcsFieldText = i18n.translate(
  'xpack.streams.streamDetailSchemaEditor.uknownEcsFieldText',
  { defaultMessage: 'Not an ECS field' }
);

const LoadingText = i18n.translate(
  'xpack.streams.streamDetailSchemaEditor.ecsRecommendationLoadingText',
  { defaultMessage: 'Loading...' }
);

export const EcsRecommendation = ({
  recommendation,
  isLoading,
}: {
  recommendation?: string;
  isLoading: boolean;
}) => {
  return (
    <EuiText size="xs">
      {`${EcsRecommendationText}: `}
      {isLoading ? LoadingText : recommendation !== undefined ? recommendation : UknownEcsFieldText}
    </EuiText>
  );
};
