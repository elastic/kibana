/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo, useState, useEffect } from 'react';
import { monaco, configureMonacoYamlSchema, YAML_LANG_ID } from '@kbn/monaco';
import { getSelectorsAndResponsesFromYaml } from '../../../../common/utils/helpers';

/**
 * In order to keep this json in sync with https://github.com/elastic/cloud-defend/blob/main/modules/config/policy-schema.json
 * Do NOT commit edits to policy_schema.json as part of a PR. Please make the changes in the cloud-defend repo.
 * Buildkite will take care of creating a PR in kibana.
 */
import policySchemaJson from './policy_schema.json';

const { Uri, editor } = monaco;

const SCHEMA_URI = 'http://elastic.co/cloud_defend.json';
const modelUri = Uri.parse(SCHEMA_URI);

export const useConfigModel = (configuration: string) => {
  const [configModel, setConfigModel] = useState<monaco.editor.ITextModel | null>(null);

  const schema = useMemo(() => {
    const _schema: any = { ...policySchemaJson };
    const { selectors } = getSelectorsAndResponsesFromYaml(configuration);

    // dynamically setting enum values for response match and exclude properties.
    if (_schema.$defs.fileResponse.properties.match.items) {
      const responseProps = _schema.$defs.fileResponse.properties;
      const selectorEnum = {
        enum: selectors
          .filter((selector) => selector.type === 'file')
          .map((selector) => selector.name),
      };
      responseProps.match.items = selectorEnum;
      responseProps.exclude.items = selectorEnum;
    }

    if (_schema.$defs.processResponse.properties.match.items) {
      const responseProps = _schema.$defs.processResponse.properties;
      const selectorEnum = {
        enum: selectors
          .filter((selector) => selector.type === 'process')
          .map((selector) => selector.name),
      };
      responseProps.match.items = selectorEnum;
      responseProps.exclude.items = selectorEnum;
    }

    return _schema;
  }, [configuration]);

  useEffect(() => {
    async function configureMonacoYaml(...args: Parameters<typeof configureMonacoYamlSchema>) {
      const { dispose } = await configureMonacoYamlSchema(...args);

      let model = editor.getModel(modelUri);

      if (model === null) {
        model = editor.createModel('', YAML_LANG_ID, modelUri);
      }

      setConfigModel(model);

      return () => dispose();
    }

    configureMonacoYaml([
      {
        uri: SCHEMA_URI,
        fileMatch: [String(modelUri)],
        schema,
      },
    ]);
  }, [schema]);

  return configModel;
};
