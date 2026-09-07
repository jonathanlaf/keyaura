// GitHub's latest-release endpoint supplies stable vX.Y.Z tags.
export function isNewerVersion(remote, current) {
  const parse = value => /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(value))?.slice(1).map(Number);
  const a = parse(remote);
  const b = parse(current);
  if (!a || !b) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index];
  }
  return false;
}
