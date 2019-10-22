
export default function({ loadTestFile }) {
  describe('settings app', function() {
    // require('./_get_version_info');
    loadTestFile(require.resolve('./_index_pattern_create_delete'));
  });
}
