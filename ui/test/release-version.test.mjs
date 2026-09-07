import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNewerVersion } from '../release-version.mjs';

test('recognizes newer stable releases across patch, minor, and major rollovers', () => {
  for (const [remote, current] of [['v0.0.5', '0.0.4'], ['v0.1.0', '0.0.4'], ['v1.0.0', '0.9.9'], ['v0.0.10', '0.0.9']]) {
    assert.equal(isNewerVersion(remote, current), true, `${remote} > ${current}`);
    assert.equal(isNewerVersion(current, remote), false, `${current} < ${remote}`);
  }
});

test('does not advertise equal, invalid, or prerelease versions as stable updates', () => {
  for (const remote of ['v0.0.4', '0.0.4', 'v0.0.3', 'v0.1.0-beta.1', 'latest', '', undefined]) {
    assert.equal(isNewerVersion(remote, '0.0.4'), false);
  }
  assert.equal(isNewerVersion('v0.0.5', 'invalid'), false);
});
