
export default function ({ loadTestFile }) {
  describe('metricbeat app', function () {
    // this.timeout = defaultTimeout;

    loadTestFile(require.resolve('./_metricbeat'));
  });
}
