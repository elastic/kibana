
export default function({ getService, loadTestFile }) {

  describe('reporting app', function() {
    const browser = getService('browser');

    before(async () => {
      await browser.setWindowSize(1200, 800);
    });

    // require('./_reporting');  //currently broke in 6.6 because you have to save the visualization before you can pdf it
    loadTestFile(require.resolve('./reporting_watcher_png'));
    loadTestFile(require.resolve('./reporting_watcher'));
  });
}
