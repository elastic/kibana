// import { defaultTimeout, esClient, common } from '../../../support';
//  describe('telemetry feature', function () {
//   // timeout = 1800000;
//    require('./_telemetry');
//  });
export default function ({ getService, loadTestFile }) {
  const browser = getService('browser');

  describe('telemetry feature', function () {
    this.tags('ciGroup1');

    before(async function () {
      await browser.setWindowSize(1200, 800);
    });

    loadTestFile(require.resolve('./_telemetry'));
  });
}
