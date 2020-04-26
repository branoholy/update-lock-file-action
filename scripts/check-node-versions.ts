import { readdirSync, readFileSync } from 'fs';
import path from 'path';

import { engines } from '../package.json';

const NVMRC_PATH = '.nvmrc';
const WORKFLOW_DIRECTORY = '.github/workflows/';

const getNvmrcNodeVersion = () => {
  const content = readFileSync(NVMRC_PATH).toString().trim();
  return content.startsWith('v') ? content.substr(1) : content;
};

const getPackageNodeVersion = () => {
  return engines.node;
};

const getWorkflowNodeVersions = (path: string) => {
  const content = readFileSync(path).toString();
  const lines = content.split('\n');

  return lines.reduce<string[]>((acc, line) => {
    const [fieldName, fieldValue] = line.split(':');

    return fieldName.trim() === 'node-version' ? [...acc, fieldValue.trim()] : acc;
  }, []);
};

const main = () => {
  try {
    const workflowFileNames = readdirSync(WORKFLOW_DIRECTORY);
    const workflowNodeVersions = workflowFileNames.reduce<string[]>((acc, workflowFileName) => {
      const workflowPath = path.join(WORKFLOW_DIRECTORY, workflowFileName);
      return [...acc, ...getWorkflowNodeVersions(workflowPath)];
    }, []);

    const nodeVersions = [getNvmrcNodeVersion(), getPackageNodeVersion(), ...workflowNodeVersions];

    const versionsAreSame = new Set(nodeVersions).size === 1;
    if (!versionsAreSame) {
      console.info('Some Node.js versions are not synced.');
      return 1;
    }

    console.info('All Node.js versions are the same.');

    return 0;
  } catch (error) {
    console.error(error);
    return 1;
  }
};

process.exit(main());
