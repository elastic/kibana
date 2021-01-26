/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as ts from 'typescript';
import * as path from 'path';
import expect from '@kbn/expect';
import { getInterfacesDescriptors, loadProgram } from '@kbn/telemetry-tools';
import { FtrProviderContext } from '../../ftr_provider_context';
// @ts-ignore

export default function ({ getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const uiSettingsCollectorTypesPath = path.resolve(
    process.cwd(),
    '../src/plugins/kibana_usage_collection/server/collectors/management/types.ts'
  );

  describe('Management Collection', () => {
    let interfaceObject: Record<string, any>;
    let registeredSettings: Record<string, any>;

    before(async () => {
      const { program } = loadProgram([uiSettingsCollectorTypesPath]);
      const sourceFile = program.getSourceFile(uiSettingsCollectorTypesPath);
      if (!sourceFile) {
        throw Error('sourceFile is undefined!');
      }

      const interfacesObjects: Array<Record<string, any>> = getInterfacesDescriptors(
        sourceFile,
        program,
        'UsageStats'
      );
      if (interfacesObjects.length !== 1) {
        throw Error('Unable to parse interface UsageStats correctly');
      }

      interfaceObject = interfacesObjects[0];
      registeredSettings = await kibanaServer.uiSettings.getAllRegistered<any>();
    });

    it('registers all UI Settings in the UsageStats interface', () => {
      const unreportedUISettings = Object.keys(registeredSettings)
        .filter((key) => key !== 'buildNum')
        .filter((key) => typeof interfaceObject[key] === 'undefined');

      expect(unreportedUISettings).to.eql([]);
    });

    it('registers all sensitive UI settings as boolean type', async () => {
      const sensitiveSettings = Object.entries(registeredSettings)
        .filter(([, config]) => config.sensitive)
        .map(([key]) => key);

      const nonBooleanSensitiveProps = sensitiveSettings
        .map((key) => ({ key, ...interfaceObject[key] }))
        .filter((keyDescriptor) => keyDescriptor.kind !== ts.SyntaxKind.BooleanKeyword);

      expect(nonBooleanSensitiveProps).to.eql([]);
    });
  });
}
