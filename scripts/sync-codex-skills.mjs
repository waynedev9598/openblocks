import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const repoSkillsDir = path.join(repoRoot, ".agents", "skills");
const userAgentsDir = path.join(os.homedir(), ".agents");
const codexSkillsDir = path.join(userAgentsDir, "skills");
const command = process.argv[2] || "list";

async function listRepoSkills() {
  const entries = await fs.readdir(repoSkillsDir, { withFileTypes: true });
  const skills = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillDir = path.join(repoSkillsDir, entry.name);
    const skillFile = path.join(skillDir, "SKILL.md");
    const exists = await fs.stat(skillFile).then((s) => s.isFile()).catch(() => false);
    if (!exists) continue;

    const contents = await fs.readFile(skillFile, "utf8");
    const nameMatch = contents.match(/^name:\s*([^\n]+)$/m);
    const skillName = nameMatch?.[1]?.trim().replace(/^['"]|['"]$/g, "");
    if (!skillName) {
      throw new Error(`Could not determine skill name from ${skillFile}`);
    }

    skills.push({ dirName: entry.name, skillName });
  }
  return skills.sort((a, b) => a.skillName.localeCompare(b.skillName));
}

async function statusForSkill(skill) {
  const source = path.join(repoSkillsDir, skill.dirName);
  const skillName = skill.skillName;
  const target = path.join(codexSkillsDir, skillName);
  const stat = await fs.lstat(target).catch(() => null);
  if (!stat) return { installed: false, detail: "missing" };
  if (!stat.isSymbolicLink()) return { installed: false, detail: "exists but is not a symlink" };

  const linkTarget = await fs.readlink(target);
  const resolvedTarget = path.resolve(path.dirname(target), linkTarget);
  const resolvedSource = path.resolve(source);
  if (resolvedTarget === resolvedSource) {
    return { installed: true, detail: "linked" };
  }
  return { installed: false, detail: `linked elsewhere -> ${resolvedTarget}` };
}

async function listSkills() {
  const skills = await listRepoSkills();
  console.log(`Repo skill source: ${repoSkillsDir}`);
  console.log(`Codex skill target: ${codexSkillsDir}`);
  for (const skill of skills) {
    const status = await statusForSkill(skill);
    const sourceDetail = skill.dirName === skill.skillName ? "" : ` <- ${skill.dirName}`;
    console.log(`${status.installed ? "[installed]" : "[missing]"} ${skill.skillName}${sourceDetail}${status.detail ? ` (${status.detail})` : ""}`);
  }
}

async function installSkills() {
  const skills = await listRepoSkills();
  await fs.mkdir(codexSkillsDir, { recursive: true });

  let hadConflict = false;
  for (const skill of skills) {
    const source = path.join(repoSkillsDir, skill.dirName);
    const target = path.join(codexSkillsDir, skill.skillName);
    const status = await statusForSkill(skill);
    if (status.installed) {
      console.log(`[ok] ${skill.skillName} already linked`);
      continue;
    }

    const existing = await fs.lstat(target).catch(() => null);
    if (existing) {
      hadConflict = true;
      console.error(`[skip] ${skill.skillName}: ${status.detail}`);
      continue;
    }

    await fs.symlink(source, target, "dir");
    console.log(`[linked] ${skill.skillName} -> ${source}`);
  }

  if (hadConflict) {
    process.exitCode = 1;
    console.error("One or more Codex skill paths already exist and were left untouched.");
  }
}

async function removeSkills() {
  const skills = await listRepoSkills();
  for (const skill of skills) {
    const target = path.join(codexSkillsDir, skill.skillName);
    const status = await statusForSkill(skill);
    if (!status.installed) {
      console.log(`[skip] ${skill.skillName}: ${status.detail}`);
      continue;
    }
    await fs.rm(target, { recursive: true, force: true });
    console.log(`[removed] ${skill.skillName}`);
  }
}

switch (command) {
  case "list":
    await listSkills();
    break;
  case "install":
    await installSkills();
    break;
  case "remove":
    await removeSkills();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.error("Usage: node scripts/sync-codex-skills.mjs [list|install|remove]");
    process.exit(1);
}
