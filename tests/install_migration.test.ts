import { expect, test } from "bun:test";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

test("omp install removes the legacy post notification hook", async () => {
  const home = await mkdtemp(join(tmpdir(), "good-news-install-"));
  const legacyHook = join(home, ".omp", "agent", "hooks", "post", "ai-toolkit-notify.ts");
  const installedHook = join(home, ".omp", "agent", "extensions", "good-news-everyone-hook.ts");
  await mkdir(dirname(legacyHook), { recursive: true });
  await writeFile(legacyHook, "legacy hook");

  try {
    const result = Bun.spawnSync(["bash", "scripts/install.sh", "omp"], {
      cwd: join(import.meta.dir, ".."),
      env: {
        BUN_COMMAND: process.execPath,
        HOME: home,
        PATH: process.env.PATH ?? "",
      },
    });

    expect(result.exitCode).toBe(0);
    expect(await exists(legacyHook)).toBe(false);
    expect(await exists(installedHook)).toBe(true);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});
