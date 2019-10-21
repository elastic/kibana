
export default function ({ loadTestFile }) {
  describe('code test', function() {
    loadTestFile(require.resolve('./_manage_repositories'));
  });
}
