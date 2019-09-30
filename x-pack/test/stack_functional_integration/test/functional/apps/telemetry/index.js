export default function ({ loadTestFile }) {
  describe('telemetry feature', function () {
    this.tags('ciGroup1');
    loadTestFile(require.resolve('./_telemetry'));
  });
}
