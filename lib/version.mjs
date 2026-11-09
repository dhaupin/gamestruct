/**
 * The version truth. package.json is THE single version of this tree (the
 * family rule): the publish lane's verify job probes the installed bin with
 * `--version`, so the answer must come from package.json, never a hand-copied
 * constant that drifts on the next cut. package.json always rides the
 * tarball, so this read works from a consumer install.
 */
import { readFileSync } from 'node:fs';

export const VERSION = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8')
).version;
