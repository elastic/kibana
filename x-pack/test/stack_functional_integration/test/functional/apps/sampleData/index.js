export default ({ loadTestFile }) => {
  describe('sample data', function() {
    loadTestFile(require.resolve('./_eCommerce'));
  });
}
