/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { SchemaErrorsAccordion } from '../../../../shared/schema';
import { ENGINE_DOCUMENT_DETAIL_PATH } from '../../../routes';
import { EngineLogic, generateEnginePath, getEngineBreadcrumbs } from '../../engine';
import { AppSearchPageTemplate } from '../../layout';
import { SCHEMA_TITLE } from '../constants';

import { ReindexJobLogic } from './reindex_job_logic';

export const ReindexJob: React.FC = () => {
  const { reindexJobId } = useParams() as { reindexJobId: string };
  const { loadReindexJob } = useActions(ReindexJobLogic);
  const { dataLoading, fieldCoercionErrors } = useValues(ReindexJobLogic);
  const {
    engine: { schema },
  } = useValues(EngineLogic);

  useEffect(() => {
    loadReindexJob(reindexJobId);
  }, [reindexJobId]);

  return (
    <AppSearchPageTemplate
      pageChrome={getEngineBreadcrumbs([
        SCHEMA_TITLE,
        i18n.translate('xpack.enterpriseSearch.appSearch.engine.schema.reindexErrorsBreadcrumb', {
          defaultMessage: 'Reindex errors',
        }),
      ])}
      pageHeader={{
        pageTitle: i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.schema.reindexJob.title',
          { defaultMessage: 'Schema change errors' }
        ),
      }}
      isLoading={dataLoading}
    >
      <SchemaErrorsAccordion
        fieldCoercionErrors={fieldCoercionErrors}
        schema={schema!}
        generateViewPath={(documentId: string) =>
          generateEnginePath(ENGINE_DOCUMENT_DETAIL_PATH, { documentId })
        }
      />
    </AppSearchPageTemplate>
  );
};
