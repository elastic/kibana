/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  EngineComponentResourceEnum,
  type EngineComponentStatus,
} from '../../../../../common/api/entity_analytics';
import type { UnitedEntityDefinition } from '../united_entity_definitions';

const getComponentTemplateName = (definitionId: string) => `${definitionId}-latest@platform`;

interface Options {
  unitedDefinition: UnitedEntityDefinition;
  esClient: ElasticsearchClient;
}

export const createEntityIndexComponentTemplate = ({ unitedDefinition, esClient }: Options) => {
  const { entityManagerDefinition, indexMappings } = unitedDefinition;
  const name = getComponentTemplateName(entityManagerDefinition.id);
  return esClient.cluster.putComponentTemplate({
    name,
    body: {
      template: {
        settings: {
          hidden: true,
        },
        mappings: indexMappings,
      },
    },
  });
};

export const deleteEntityIndexComponentTemplate = ({ unitedDefinition, esClient }: Options) => {
  const { entityManagerDefinition } = unitedDefinition;
  const name = getComponentTemplateName(entityManagerDefinition.id);
  return esClient.cluster.deleteComponentTemplate(
    { name },
    {
      ignore: [404],
    }
  );
};

export const getEntityIndexComponentTemplateStatus = async ({
  definitionId,
  esClient,
}: Pick<Options, 'esClient'> & { definitionId: string }): Promise<EngineComponentStatus> => {
  const name = getComponentTemplateName(definitionId);
  const componentTemplate = await esClient.cluster.getComponentTemplate(
    {
      name,
    },
    {
      ignore: [404],
    }
  );

  return {
    id: name,
    installed: componentTemplate?.component_templates?.length > 0,
    resource: EngineComponentResourceEnum.component_template,
  };
};
