import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repositoryRoot = join(import.meta.dir, "..");
const bumpScript = join(repositoryRoot, "scripts", "bump_version.sh");

type VersionPackage = {
  version: string;
};

type CommandResult = {
  exitCode: number;
  stderr: string;
};

function runGit(repository: string, ...arguments_: string[]): string {
  const result = Bun.spawnSync(["git", ...arguments_], { cwd: repository });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.toString());
  }
  return result.stdout.toString().trim();
}

async function createRepository(version: string): Promise<string> {
  const repository = await mkdtemp(join(tmpdir(), "good-news-bump-"));
  await writeFile(join(repository, "package.json"), `${JSON.stringify({ version }, null, 2)}\n`);
  runGit(repository, "init", "-b", "main");
  runGit(repository, "config", "user.name", "Release Test");
  runGit(repository, "config", "user.email", "release-test@example.com");
  runGit(repository, "add", "package.json");
  runGit(repository, "commit", "-m", "chore: initialize test package");
  return repository;
}

async function readVersion(repository: string): Promise<string> {
  const content = await readFile(join(repository, "package.json"), "utf8");
  return (JSON.parse(content) as VersionPackage).version;
}

function runBump(repository: string, level: string, rc = false): CommandResult {
  const result = Bun.spawnSync(
    ["bash", bumpScript, level, ...(rc ? ["--rc"] : [])],
    { cwd: repository },
  );
  return {
    exitCode: result.exitCode,
    stderr: result.stderr.toString(),
  };
}

test("creates a minor stable release branch", async () => {
  const repository = await createRepository("0.1.0");

  try {
    const result = runBump(repository, "minor");

    expect(result.exitCode).toBe(0);
    expect(runGit(repository, "branch", "--show-current")).toBe("release/v0.2.0");
    expect(await readVersion(repository)).toBe("0.2.0");
    expect(runGit(repository, "log", "-1", "--pretty=%s")).toBe(
      "chore(release): prepare v0.2.0",
    );
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});

test("creates a release candidate", async () => {
  const repository = await createRepository("0.1.0");

  try {
    const result = runBump(repository, "minor", true);

    expect(result.exitCode).toBe(0);
    expect(runGit(repository, "branch", "--show-current")).toBe("release/v0.2.0-rc.1");
    expect(await readVersion(repository)).toBe("0.2.0-rc.1");
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});

test("increments an existing release candidate", async () => {
  const repository = await createRepository("0.2.0-rc.1");

  try {
    const result = runBump(repository, "minor", true);

    expect(result.exitCode).toBe(0);
    expect(runGit(repository, "branch", "--show-current")).toBe("release/v0.2.0-rc.2");
    expect(await readVersion(repository)).toBe("0.2.0-rc.2");
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});

test("promotes an existing release candidate to stable", async () => {
  const repository = await createRepository("0.2.0-rc.2");

  try {
    const result = runBump(repository, "patch");

    expect(result.exitCode).toBe(0);
    expect(runGit(repository, "branch", "--show-current")).toBe("release/v0.2.0");
    expect(await readVersion(repository)).toBe("0.2.0");
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});

test("rejects a dirty worktree", async () => {
  const repository = await createRepository("0.1.0");
  await writeFile(join(repository, "uncommitted.txt"), "changes");

  try {
    const result = runBump(repository, "patch");

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("Worktree must be clean");
    expect(runGit(repository, "branch", "--show-current")).toBe("main");
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});

test("rejects a non-main branch", async () => {
  const repository = await createRepository("0.1.0");
  runGit(repository, "switch", "-c", "feature/test");

  try {
    const result = runBump(repository, "patch");

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("main branch");
    expect(runGit(repository, "branch", "--show-current")).toBe("feature/test");
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});
