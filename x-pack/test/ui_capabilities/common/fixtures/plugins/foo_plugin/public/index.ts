/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup, Plugin } from 'src/core/public';
export const plugin = () => new FooPlugin();

class FooPlugin implements Plugin {
  setup(core: CoreSetup) {
    core.application.register({
      id: 'foo',
      title: 'Foo app',
      euiIconType: 'uiArray',
      mount() {
        return () => null;
      },
    });
  }
  start() {}
}
