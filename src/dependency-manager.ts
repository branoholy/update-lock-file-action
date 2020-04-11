import { existsSync } from 'fs';

export interface DependencyManager {
  name: 'npm' | 'yarn';
  lockFilePath: 'package-lock.json' | 'yarn.lock';
  installCommand: string;
}

const dependencyManagers: DependencyManager[] = [
  {
    name: 'npm',
    lockFilePath: 'package-lock.json',
    installCommand: 'npm i'
  },
  {
    name: 'yarn',
    lockFilePath: 'yarn.lock',
    installCommand: 'yarn'
  }
];

export const getDependencyManager = () => {
  for (const dependencyManager of dependencyManagers) {
    if (existsSync(dependencyManager.lockFilePath)) {
      return dependencyManager;
    }
  }

  return null;
};
