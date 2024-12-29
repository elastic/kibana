/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useLocation } from 'react-router-dom';

import { Location } from 'history';
import { useActions, useValues } from 'kea';

import { ESINDEX_QUERY_PARAMETER } from '../../../shared/constants';
import { parseQueryParams } from '../../../shared/query_params';
import { ENGINES_TITLE } from '../engines';
import { AppSearchPageTemplate } from '../layout';

import { ConfigureAppSearchEngine } from './configure_app_search_engine';
import { ConfigureElasticsearchEngine } from './configure_elasticsearch_engine';
import { ENGINE_CREATION_TITLE } from './constants';
import { EngineCreationLogic, EngineCreationSteps } from './engine_creation_logic';
import { ReviewElasticsearchEngine } from './review_elasticsearch_engine';
import { SelectEngineType } from './select_engine_type';

export const EngineCreation: React.FC = () => {
  const { search } = useLocation() as Location;
  const { method, ...params } = parseQueryParams(search);

  const { engineType, currentEngineCreationStep } = useValues(EngineCreationLogic);
  const { setIngestionMethod, initializeWithESIndex } = useActions(EngineCreationLogic);

  useEffect(() => {
    if (typeof method === 'string') {
      setIngestionMethod(method);
    }
    const esIndexParam = params[ESINDEX_QUERY_PARAMETER];
    if (typeof esIndexParam === 'string') {
      initializeWithESIndex(esIndexParam);
    }
  }, []);

  return (
    <AppSearchPageTemplate
      pageChrome={[ENGINES_TITLE, ENGINE_CREATION_TITLE]}
      pageHeader={{ pageTitle: ENGINE_CREATION_TITLE }}
      data-test-subj="EngineCreation"
    >
      {currentEngineCreationStep === EngineCreationSteps.SelectStep && <SelectEngineType />}
      {currentEngineCreationStep === EngineCreationSteps.ConfigureStep &&
        engineType === 'appSearch' && <ConfigureAppSearchEngine />}
      {currentEngineCreationStep === EngineCreationSteps.ConfigureStep &&
        engineType === 'elasticsearch' && <ConfigureElasticsearchEngine />}
      {currentEngineCreationStep === EngineCreationSteps.ReviewStep && (
        <ReviewElasticsearchEngine />
      )}
    </AppSearchPageTemplate>
  );
};
