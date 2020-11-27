import { diffLines } from 'diff';
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import fetch from 'node-fetch';
import path from 'path';

interface NodeDist {
  readonly version: string;
}

const createTypeValidator = <T>(validator: (value: Partial<Record<keyof T, unknown>>) => boolean) => (
  value: unknown
): value is T => typeof value === 'object' && value !== null && validator(value);

const isNodeDist = createTypeValidator<NodeDist>((value) => typeof value.version === 'string');

const NODE_DISTS_URL = 'https://nodejs.org/dist/index.json';
const WORKFLOW_DIRECTORY = '.github/workflows/';

const getLatestNodeDist = async () => {
  const response = await fetch(NODE_DISTS_URL);
  const data: unknown = await response.json();

  if (Array.isArray(data) && isNodeDist(data[0])) {
    return data[0];
  }

  return null;
};

const getLatestNodeVersion = async () => {
  const nodeDist = await getLatestNodeDist();
  const version = nodeDist?.version;

  if (version) {
    return version.startsWith('v') ? version.substr(1) : version;
  }

  return null;
};

const updateNvmrc = (path: string, version: string) => {
  const content = readFileSync(path).toString();
  const nextContent = `v${version}\n`;

  if (content === nextContent) {
    return false;
  }

  writeFileSync(path, nextContent);

  return true;
};

const updatePackageJson = (path: string, version: string) => {
  const content = readFileSync(path).toString();
  const packageJson = JSON.parse(content);

  packageJson.engines.node = version;
  const nextContent = JSON.stringify(packageJson, null, 2) + '\n';

  const lineChanges = diffLines(content, nextContent);
  const addedLines = lineChanges.filter(({ added }) => added);
  const removedLines = lineChanges.filter(({ removed }) => removed);

  if (lineChanges.length === 1 && addedLines.length === 0 && removedLines.length === 0) {
    return false;
  }

  const changeValid =
    addedLines.length === 1 &&
    addedLines[0]?.count === 1 &&
    addedLines[0].value === `    "node": "${version}"\n` &&
    removedLines.length === 1 &&
    removedLines[0]?.count === 1;

  if (!changeValid) {
    throw new Error(`Invalid change of ${path}`);
  }

  writeFileSync(path, nextContent);

  return true;
};

const updateWorkflowYaml = (path: string, version: string) => {
  const content = readFileSync(path).toString();
  const lines = content.split('\n');

  let changed = false;
  const nextLines = lines.map((line) => {
    const [fieldName, fieldValue] = line.trim().split(':');

    if (fieldName === 'node-version' && fieldValue?.trim() !== version) {
      changed = true;
      const indentSize = line.indexOf(fieldName[0] ?? 'n');

      return `${' '.repeat(indentSize)}${fieldName}: ${version}`;
    }

    return line;
  });

  if (!changed) {
    return false;
  }

  const nextContent = nextLines.join('\n');
  writeFileSync(path, nextContent);

  return true;
};

const createUpdateFile = (version: string) => (
  path: string,
  updateFunction: (path: string, version: string) => boolean
) => {
  process.stdout.write(`Updating ${path} ... `);

  try {
    if (updateFunction(path, version)) {
      console.info('✅ Done');
    } else {
      console.info('✅ Not required');
    }
  } catch (error) {
    console.error('❌ Failed');
    throw error;
  }
};

const main = async () => {
  try {
    const latestNodeVersion = await getLatestNodeVersion();
    if (!latestNodeVersion) {
      console.error('Error: Unknown latest Node.js version');
      return 1;
    }

    console.info(`Info: Trying to update Node.js to ${latestNodeVersion}`);

    const updateFile = createUpdateFile(latestNodeVersion);

    updateFile('.nvmrc', updateNvmrc);
    updateFile('package.json', updatePackageJson);

    const workflowFileNames = readdirSync(WORKFLOW_DIRECTORY);
    workflowFileNames.forEach((workflowFileName) => {
      const workflowPath = path.join(WORKFLOW_DIRECTORY, workflowFileName);

      updateFile(workflowPath, updateWorkflowYaml);
    });

    return 0;
  } catch (error) {
    return 1;
  }
};

main().then((code) => process.exit(code));
