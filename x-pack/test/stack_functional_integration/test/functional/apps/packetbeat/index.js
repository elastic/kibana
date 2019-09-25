
export default function ({ loadTestFile }) {
  describe('packetbeat app', function() {
    loadTestFile(require.resolve('./_packetbeat'));
  });
}
