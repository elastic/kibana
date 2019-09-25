
export default function ({ loadTestFile }) {
  describe('filebeat app', function () {
    loadTestFile(require.resolve('./_filebeat'));
  });
}
