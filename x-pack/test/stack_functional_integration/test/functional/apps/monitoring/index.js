export default function({ loadTestFile }) {
  describe('monitoring app', function() {
    loadTestFile(require.resolve('./_monitoring'));
  });
}
