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
import type { EntityEngineInstallationDescriptor } from '../installation/types';

const getComponentTemplateName = (definitionId: string) => `${definitionId}-latest@platform`;

interface Options {
  /**
   * The entity engine description id
   **/
  id: string;
  esClient: ElasticsearchClient;
}

export const createEntityIndexComponentTemplate = (
  description: EntityEngineInstallationDescriptor,
  esClient: ElasticsearchClient
) => {
  const { id, indexMappings } = description;
  const name = getComponentTemplateName(id);
  return esClient.cluster.putComponentTemplate({
    name,
    template: {
      settings: {
        hidden: true,
      },
      mappings: indexMappings,
    },
  });
};

export const deleteEntityIndexComponentTemplate = ({ id, esClient }: Options) => {
  const name = getComponentTemplateName(id);
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
