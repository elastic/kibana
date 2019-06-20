/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common', 'maps']);
  const visualTesting = getService('visualTesting');

  describe('vector_styling', () => {
    describe('symbolize as icon', () => {
      before(async () => {
        await PageObjects.maps.loadSavedMap('vector styling icon demo');
      });

      it('should symbolize points as icons with expected color, size, and orientation', async () => {
        await PageObjects.common.sleep(2000);
        await visualTesting.snapshot();
      });

    });
  });
}
